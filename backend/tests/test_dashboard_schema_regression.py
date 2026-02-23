"""
[회귀 테스트] fetch_dashboard_data 반환 구조가 Data Contract(CRITICAL_LOGIC §3.3)를
준수하는지 검증합니다. SQL/쿼리 수정 시 컬럼 누락·명칭 변경을 차단합니다.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# CRITICAL_LOGIC §3.3 Dashboard Data Contract
CONTRACT = {
    "admission": [
        "id", "patient_name_masked", "room_number", "status", "discharged_at",
        "access_token", "dob", "gender", "check_in_at", "display_name",
        "attending_physician",
    ],
    "vitals": ["id", "admission_id", "temperature", "has_medication", "medication_type", "recorded_at"],
    "iv_records": ["id", "admission_id", "photo_url", "infusion_rate", "created_at"],
    "meals": [
        "id", "admission_id", "request_type", "pediatric_meal_type", "guardian_meal_type",
        "requested_pediatric_meal_type", "requested_guardian_meal_type", "room_note",
        "meal_date", "meal_time", "status", "created_at",
    ],
    "exam_schedules": ["id", "admission_id", "scheduled_at", "name", "note"],
    "document_requests": ["id", "admission_id", "request_items", "status", "created_at"],
}


def _make_mock_res(data: list | dict) -> MagicMock:
    res = MagicMock()
    res.data = [data] if isinstance(data, dict) else data
    return res


@pytest.mark.anyio
@pytest.mark.parametrize("anyio_backend", ["asyncio"])
async def test_fetch_dashboard_data_schema_contract(anyio_backend):
    """fetch_dashboard_data 반환 객체의 필드 구조가 Data Contract를 준수하는지 검증."""
    from services.dashboard import fetch_dashboard_data

    # Mock responses: one row per category with contract keys (values dummy)
    admission_row = {k: ("" if k in ("patient_name_masked", "room_number", "status") else None) for k in CONTRACT["admission"] if k != "display_name"}
    admission_row["display_name"] = "환자"  # set by service
    mock_responses = [
        _make_mock_res(admission_row),
        _make_mock_res([{k: None for k in CONTRACT["vitals"]}]),
        _make_mock_res([{k: None for k in CONTRACT["iv_records"]}]),
        _make_mock_res([{k: None for k in CONTRACT["meals"]}]),
        _make_mock_res([{k: None for k in CONTRACT["exam_schedules"]}]),
        _make_mock_res([{k: None for k in CONTRACT["document_requests"]}]),
    ]

    mock_db = MagicMock()
    with patch("services.dashboard.execute_with_retry_async", new_callable=AsyncMock, side_effect=mock_responses):
        with patch("services.dashboard.create_audit_log"):
            result = await fetch_dashboard_data(mock_db, "test-admission-id")

    for key, required_fields in CONTRACT.items():
        payload = result[key]
        sample = payload[0] if isinstance(payload, list) and payload else payload
        assert sample is not None, f"'{key}' 데이터가 비어 있습니다."
        actual = list(sample.keys())
        for field in required_fields:
            assert field in actual, (
                f"CRITICAL: '{key}' 구조에서 필수 컬럼 '{field}'이(가) 누락되었습니다. "
                f"현재 컬럼: {actual}"
            )
