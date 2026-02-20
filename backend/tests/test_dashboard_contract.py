
import sys
import os
from datetime import datetime
import asyncio

# Add backend path to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from schemas import DashboardResponse
from logger import logger

def test_dashboard_response_schema():
    logger.info("--- Testing DashboardResponse Schema ---")
    
    # Mock data simulating what services/dashboard.py returns
    mock_data = {
        "admission": {
            "id": "adm_123",
            "patient_name_masked": "김*수",
            "display_name": "김*수", # Added for Phase 2 Contract
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
        logger.info("SUCCESS: Data validated against DashboardResponse")
        logger.info(f"Serialized: {model.dict()}")
        
        # Verify patient_name_masked is present
        assert model.admission.patient_name_masked == "김*수"
        logger.info("SUCCESS: patient_name_masked verified")
        
    except Exception as e:
        logger.error(f"FAILURE: Validation error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_dashboard_response_schema()
