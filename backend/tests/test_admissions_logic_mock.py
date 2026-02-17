import pytest
from unittest.mock import MagicMock, AsyncMock
from datetime import datetime, timedelta

from services.admission_service import list_active_admissions_enriched

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def mock_execute(monkeypatch):
    m = AsyncMock()
    # Mocking in the service module now
    monkeypatch.setattr("services.admission_service.execute_with_retry_async", m)
    return m

@pytest.mark.anyio
@pytest.mark.parametrize("anyio_backend", ["asyncio"])
async def test_list_admissions_logic(anyio_backend, mock_db, mock_execute):
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
    
    # Mock IV data response
    mock_iv_data = [
        {"admission_id": "adm_4", "infusion_rate": 20, "created_at": t3},
        {"admission_id": "adm_3", "infusion_rate": 10, "created_at": t3},
        {"admission_id": "adm_3", "infusion_rate": 5, "created_at": t2},
    ]

    # Mock Vitals data response
    mock_vitals_data = [
        {"admission_id": "adm_3", "temperature": 38.5, "recorded_at": t3},
        {"admission_id": "adm_4", "temperature": 36.5, "recorded_at": t3},
    ]

    # Mock Meals data response
    mock_meals_data = [
        {"admission_id": "adm_3", "request_type": "BREAKFAST", "created_at": t3}
    ]

    # Setup mocks for sequential calls
    mock_execute.side_effect = [
        MagicMock(data=mock_admissions_data), # 1. Admissions
        MagicMock(data=mock_iv_data),         # 2. IVs
        MagicMock(data=mock_vitals_data),      # 3. Vitals
        MagicMock(data=mock_meals_data)       # 4. Meals
    ]

    # Run the function
    result = await list_active_admissions_enriched(mock_db)
    
    # Verify Deduplication
    assert len(result) == 2, "Should have 2 unique admissions (Room 101, 102)"
    
    adm_101 = next(r for r in result if r['room_number'] == '101')
    assert adm_101['id'] == "adm_3", f"Deduplication picked {adm_101['id']} instead of adm_3"

    # Verify IV Mapping
    assert adm_101.get('latest_iv', {}).get('infusion_rate') == 10, "IV mapping incorrect. Expected 10"

    # Verify DB Call Count (N+1 Optimization)
    assert mock_execute.call_count == 4, f"Expected 4 DB calls, got {mock_execute.call_count}"

@pytest.mark.anyio
@pytest.mark.parametrize("anyio_backend", ["asyncio"])
async def test_fever_6h_boundary(anyio_backend, mock_db, mock_execute):
    from datetime import timezone
    now = datetime.now(timezone.utc)
    
    # 5 hours 55 mins ago (Should be True)
    t_within = (now - timedelta(hours=5, minutes=55)).isoformat()
    # 6 hours 5 mins ago (Should be False)
    t_outside = (now - timedelta(hours=6, minutes=5)).isoformat()

    mock_admissions_data = [
        {"id": "adm_within", "room_number": "101", "status": "IN_PROGRESS"},
        {"id": "adm_outside", "room_number": "102", "status": "IN_PROGRESS"},
    ]

    mock_vitals_data = [
        {"admission_id": "adm_within", "temperature": 38.5, "recorded_at": t_within},
        {"admission_id": "adm_outside", "temperature": 38.5, "recorded_at": t_outside},
    ]

    mock_execute.side_effect = [
        MagicMock(data=mock_admissions_data),
        MagicMock(data=[]), # IVs
        MagicMock(data=mock_vitals_data),
        MagicMock(data=[])  # Meals
    ]

    result = await list_active_admissions_enriched(mock_db)

    adm_within = next(r for r in result if r['id'] == 'adm_within')
    adm_outside = next(r for r in result if r['id'] == 'adm_outside')

    assert adm_within['had_fever_in_6h'] is True, "Fever within 6h should be True"
    assert adm_outside['had_fever_in_6h'] is False, "Fever outside 6h should be False"
