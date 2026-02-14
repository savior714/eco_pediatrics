
import sys
import os
from datetime import datetime
import asyncio

# Add backend path to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from schemas import DashboardResponse

def test_dashboard_response_schema():
    print("--- Testing DashboardResponse Schema ---")
    
    # Mock data simulating what services/dashboard.py returns
    mock_data = {
        "admission": {
            "id": "adm_123",
            "patient_name_masked": "김*수",
            "room_number": "301",
            "check_in_at": datetime.now(),
            "discharged_at": None,
            "access_token": "token_123",
            "status": "IN_PROGRESS" # Extra field, Pydantic should ignore or allow if config allows, 
                                    # but my model didn't have Config to ignore extras. 
                                    # Default Pydantic V2 ignores extras? V1 ignores.
                                    # models.py uses Pydantic.
        },
        "vitals": [
            {
                "id": 1,
                "admission_id": "adm_123",
                "temperature": 36.5,
                "has_medication": False,
                "recorded_at": datetime.now()
            }
        ],
        "iv_records": [],
        "meals": [],
        "exam_schedules": [],
        "document_requests": []
    }
    
    try:
        model = DashboardResponse(**mock_data)
        print("SUCCESS: Data validated against DashboardResponse")
        print(f"Serialized: {model.dict()}")
        
        # Verify patient_name_masked is present
        assert model.admission.patient_name_masked == "김*수"
        print("SUCCESS: patient_name_masked verified")
        
    except Exception as e:
        print(f"FAILURE: Validation error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_dashboard_response_schema()
