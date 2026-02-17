import pytest
import copy
from unittest.mock import AsyncMock, patch, MagicMock
from postgrest.exceptions import APIError
from datetime import date
from models import MealRequestCreate, MealTime

# Import the function from the service
from services.meal_service import upsert_meal_request

@pytest.mark.anyio
@pytest.mark.parametrize("anyio_backend", ["asyncio"])
async def test_upsert_meal_request_fallback_on_schema_error(anyio_backend):
    # Mock data
    req = MealRequestCreate(
        admission_id="adm-123",
        meal_date=date(2026, 2, 15),
        meal_time=MealTime.LUNCH,
        request_type="PATIENT_REQUEST",
        pediatric_meal_type="REGULAR",
        guardian_meal_type="REGULAR"
    )

    # Mock DB client
    mock_db = MagicMock()
    mock_query_builder = MagicMock()

    # Setup chain: db.table("...").select/upsert...
    mock_db.table.return_value = mock_query_builder
    mock_query_builder.select.return_value = mock_query_builder
    mock_query_builder.eq.return_value = mock_query_builder
    mock_query_builder.gte.return_value = mock_query_builder
    mock_query_builder.lte.return_value = mock_query_builder
    mock_query_builder.order.return_value = mock_query_builder
    mock_query_builder.single.return_value = mock_query_builder

    # Create an APIError instance simulating the schema error
    error_dict = {
        'message': "Could not find the 'requested_guardian_meal_type' column of 'meal_requests' in the schema cache",
        'code': 'PGRST204',
        'hint': None,
        'details': None
    }
    schema_error = APIError(error_dict)

    # Patch execute_with_retry_async in services.meal_service
    with patch("services.meal_service.execute_with_retry_async", new_callable=AsyncMock) as mock_execute:
        mock_execute.side_effect = [
            AsyncMock(data=[]),         # 1. Check existing
            schema_error,               # 2. Upsert fails
            AsyncMock(data=[{"id": "123"}]), # 3. Upsert retry succeeds
            AsyncMock(data=None)        # 4. Broadcast info fetch
        ]

        captured_upsert_args = []
        def capture_upsert_args(data, **kwargs):
            captured_upsert_args.append(copy.deepcopy(data))
            return mock_query_builder

        mock_query_builder.upsert.side_effect = capture_upsert_args

        # Also patch broadcast_to_station_and_patient in services.meal_service
        with patch("services.meal_service.broadcast_to_station_and_patient", new_callable=AsyncMock):
             await upsert_meal_request(mock_db, req)

        # Verification
        assert mock_execute.call_count >= 3
        assert len(captured_upsert_args) == 2

        # First upsert call (failed one)
        first_data = captured_upsert_args[0]
        assert "requested_pediatric_meal_type" in first_data
        assert "requested_guardian_meal_type" in first_data

        # Second upsert call (retry)
        second_data = captured_upsert_args[1]
        assert "requested_pediatric_meal_type" not in second_data
        assert "requested_guardian_meal_type" not in second_data
        assert "status" in second_data
