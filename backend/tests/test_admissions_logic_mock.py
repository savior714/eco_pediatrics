import asyncio
import pytest
import sys
import os
from unittest.mock import MagicMock, AsyncMock
from datetime import datetime, timedelta

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Mock dependencies before import
sys.modules["supabase._async.client"] = MagicMock()
sys.modules["utils"] = MagicMock()
sys.modules["dependencies"] = MagicMock()
sys.modules["services"] = MagicMock()
sys.modules["services.dashboard"] = MagicMock()

# Import the function to test
# We need to mock utils.execute_with_retry_async specifically as it's used in the function
mock_execute = AsyncMock()
sys.modules["utils"].execute_with_retry_async = mock_execute

from routers.admissions import list_admissions

@pytest.mark.asyncio
async def test_logic():
    mock_execute.reset_mock()
    print("--- Testing Admissions Logic (Dedupe & Batch IV) ---")

    # Scenario: 
    # Room 101 has 3 admissions:
    # 1. Old (Discharged)
    # 2. Newer (In Progress, but older check_in) - "Zombie"
    # 3. Newest (In Progress) - Real
    
    now = datetime.now()
    t1 = (now - timedelta(days=2)).isoformat()
    t2 = (now - timedelta(days=1)).isoformat()
    t3 = now.isoformat()

    mock_admissions_data = [
        {"id": "adm_1", "room_number": "101", "status": "DISCHARGED", "check_in_at": t1},
        {"id": "adm_2", "room_number": "101", "status": "IN_PROGRESS", "check_in_at": t2}, 
        {"id": "adm_3", "room_number": "101", "status": "IN_PROGRESS", "check_in_at": t3}, # Should win
        {"id": "adm_4", "room_number": "102", "status": "IN_PROGRESS", "check_in_at": t3}, # Distinct room
    ]
    
    # Mock IV data response for Batch Query
    # We expect query for adm_3 and adm_4
    mock_iv_data = [
        {"admission_id": "adm_4", "infusion_rate": 20, "created_at": t3},
        {"admission_id": "adm_3", "infusion_rate": 10, "created_at": t3},
        {"admission_id": "adm_3", "infusion_rate": 5, "created_at": t2}, # Older record for adm_3
    ]

    # Mock Vitals data response (3rd call)
    mock_vitals_data = [
        {"admission_id": "adm_3", "temperature": 38.5, "recorded_at": t3},
        {"admission_id": "adm_4", "temperature": 36.5, "recorded_at": t3},
    ]

    # Mock Meals data response (4th call)
    mock_meals_data = [
        {"admission_id": "adm_3", "request_type": "BREAKFAST", "created_at": t3}
    ]

    # Setup mocks
    db = MagicMock()
    
    # Calls: 
    # 1. Admissions
    # 2. IVs
    # 3. Vitals
    # 4. Meals
    
    mock_execute.side_effect = [
        MagicMock(data=mock_admissions_data), # 1. Admissions
        MagicMock(data=mock_iv_data),         # 2. IVs
        MagicMock(data=mock_vitals_data),      # 3. Vitals
        MagicMock(data=mock_meals_data)       # 4. Meals
    ]

    # Run the function
    result = await list_admissions(db)
    
    # Verify Deduplication
    print(f"Result count: {len(result)}")
    assert len(result) == 2, "Should have 2 unique admissions (Room 101, 102)"
    
    adm_101 = next(r for r in result if r['room_number'] == '101')
    print(f"Room 101 winner: {adm_101['id']} (Time: {adm_101['check_in_at']})")
    
    if adm_101['id'] != "adm_3":
        print(f"FAILURE: Deduplication picked {adm_101['id']} instead of adm_3")
        sys.exit(1)
    else:
        print("SUCCESS: Deduplication logic correct (picked newest IN_PROGRESS)")

    # Verify IV Mapping (N+1 fix verification)
    print(f"Adm 101 Latest IV Rate: {adm_101.get('latest_iv', {}).get('infusion_rate')}")
    
    if adm_101.get('latest_iv', {}).get('infusion_rate') != 10:
        print("FAILURE: IV mapping incorrect. Expected 10 (newest for adm_3)")
        sys.exit(1)
    else:
         print("SUCCESS: IV mapping correct")

    # Verify Batch Query Usage
    # Check that execute_with_retry_async was called twice (not N+1 times)
    call_count = mock_execute.call_count
    print(f"DB Call Count: {call_count}")
    
    if call_count != 4:
        print(f"FAILURE: Expected 4 DB calls, got {call_count}. enrichment might have failed.")
        sys.exit(1)
    else:
        print("SUCCESS: N+1 Optimization verified (Only 4 DB calls)")

if __name__ == "__main__":
    asyncio.run(test_logic())
