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
    # Scenario: The service now calls db.table("view_station_dashboard").select("*")
    # which returns a flat list of enriched records.
    now = datetime.now()
    t3 = now.isoformat()

    mock_view_data = [
        {
            "id": "adm_3", 
            "room_number": "101", 
            "display_name": "김*수", 
            "access_token": "token3",
            "dob": "2020-01-01",
            "gender": "M",
            "check_in_at": t3,
            "attending_physician": "김종률",
            "latest_temp": 38.5,
            "last_vital_at": t3,
            "had_fever_in_6h": True,
            "iv_rate": 10,
            "iv_photo": "http://photo3",
            "meal_type": "BREAKFAST",
            "pediatric_meal_type": "일반",
            "guardian_meal_type": "선택 안함",
            "meal_requested_at": t3
        },
        {
            "id": "adm_4", 
            "room_number": "102", 
            "display_name": "이*희", 
            "access_token": "token4",
            "dob": "2021-05-05",
            "gender": "F",
            "check_in_at": t3,
            "attending_physician": None,
            "latest_temp": 36.5,
            "last_vital_at": t3,
            "had_fever_in_6h": False,
            "iv_rate": 20,
            "iv_photo": None,
            "meal_type": None,
            "pediatric_meal_type": None,
            "guardian_meal_type": None,
            "meal_requested_at": None
        }
    ]

    mock_execute.return_value = MagicMock(data=mock_view_data)

    # Run the function
    result = await list_active_admissions_enriched(mock_db)

    # Verify
    assert len(result) == 2
    # Check adm_3 (mapped to enriched structure)
    adm3 = next(a for a in result if a['id'] == "adm_3")
    assert adm3['display_name'] == "김*수"
    assert adm3['had_fever_in_6h'] is True
    assert adm3['latest_iv']['infusion_rate'] == 10
    assert adm3['latest_meal']['request_type'] == "BREAKFAST"
    assert mock_execute.call_count == 1

@pytest.mark.anyio
@pytest.mark.parametrize("anyio_backend", ["asyncio"])
async def test_fever_6h_boundary(anyio_backend, mock_db, mock_execute):
    # View already calculates had_fever_in_6h
    mock_view_data = [
        {
            "id": "adm_within", "room_number": "101", "display_name": "P1", 
            "access_token": "T1", "dob": None, "gender": None, "check_in_at": None,
            "latest_temp": 38.5, "last_vital_at": "...", "had_fever_in_6h": True,
            "iv_rate": None, "iv_photo": None, "meal_type": None,
            "pediatric_meal_type": None, "guardian_meal_type": None, "meal_requested_at": None
        },
        {
            "id": "adm_outside", "room_number": "102", "display_name": "P2", 
            "access_token": "T2", "dob": None, "gender": None, "check_in_at": None,
            "latest_temp": 38.5, "last_vital_at": "...", "had_fever_in_6h": False,
            "iv_rate": None, "iv_photo": None, "meal_type": None,
            "pediatric_meal_type": None, "guardian_meal_type": None, "meal_requested_at": None
        },
    ]

    mock_execute.return_value = MagicMock(data=mock_view_data)

    result = await list_active_admissions_enriched(mock_db)

    adm_in = next(a for a in result if a['id'] == "adm_within")
    adm_out = next(a for a in result if a['id'] == "adm_outside")

    assert adm_in['had_fever_in_6h'] is True
    assert adm_out['had_fever_in_6h'] is False
