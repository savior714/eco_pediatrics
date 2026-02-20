import sys
import asyncio
from unittest.mock import MagicMock, AsyncMock

# 1. Mock external dependencies BEFORE importing local modules
mock_fastapi = MagicMock()

# helper to mock router decorators
def identity_decorator(*args, **kwargs):
    def wrapper(func):
        return func
    return wrapper

mock_router = MagicMock()
mock_router.get = MagicMock(side_effect=identity_decorator)
mock_router.post = MagicMock(side_effect=identity_decorator)
mock_router.patch = MagicMock(side_effect=identity_decorator)
mock_fastapi.APIRouter.return_value = mock_router

mock_fastapi.Depends = MagicMock
mock_fastapi.HTTPException = Exception
sys.modules["fastapi"] = mock_fastapi

mock_supabase = MagicMock()
mock_supabase.client = MagicMock()
mock_supabase._async = MagicMock()
mock_supabase._async.client = MagicMock()
sys.modules["supabase"] = mock_supabase
sys.modules["supabase._async"] = mock_supabase._async
sys.modules["supabase._async.client"] = mock_supabase._async.client

mock_postgrest = MagicMock()
mock_postgrest.exceptions = MagicMock()
mock_postgrest.exceptions.APIError = Exception
sys.modules["postgrest"] = mock_postgrest
sys.modules["postgrest.exceptions"] = mock_postgrest.exceptions

mock_httpx = MagicMock()
mock_httpx.HTTPStatusError = Exception
sys.modules["httpx"] = mock_httpx

mock_pydantic = MagicMock()
mock_pydantic.BaseModel = MagicMock
sys.modules["pydantic"] = mock_pydantic

mock_loguru = MagicMock()
sys.modules["loguru"] = mock_loguru

import pytest  # noqa: E402

from routers.station import update_meal_request_status, update_document_request_status  # noqa: E402

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def mock_execute(monkeypatch):
    m = AsyncMock()
    # Patch where it is used in routers/station.py
    monkeypatch.setattr("routers.station.execute_with_retry_async", m)
    return m

@pytest.fixture
def mock_manager(monkeypatch):
    m = MagicMock()
    m.broadcast = AsyncMock()
    monkeypatch.setattr("routers.station.manager", m)
    return m

def test_update_meal_request_completed(mock_db, mock_execute, mock_manager):
    async def run_test():
        req_id = 1
        status = "COMPLETED"

        # 1. Fetch requested_* (single -> dict)
        mock_res1 = MagicMock()
        mock_res1.data = {
            "requested_pediatric_meal_type": "P_REQ",
            "requested_guardian_meal_type": "G_REQ"
        }

        # 2. Update + Select (single -> dict)
        mock_res_update = MagicMock()
        mock_res_update.data = {
            "id": req_id,
            "admission_id": "adm_1",
            "status": status,
            "pediatric_meal_type": "P_REQ",
            "guardian_meal_type": "G_REQ",
            "admissions": {"room_number": "101", "access_token": "token1"}
        }

        mock_execute.side_effect = [mock_res1, mock_res_update]

        await update_meal_request_status(req_id, status, db=mock_db)

        assert mock_execute.call_count == 2

    asyncio.run(run_test())

def test_update_meal_request_pending(mock_db, mock_execute, mock_manager):
    async def run_test():
        req_id = 1
        status = "PENDING"

        # 1. Update + Select (single -> dict)
        mock_res1 = MagicMock()
        mock_res1.data = {
            "id": req_id,
            "admission_id": "adm_1",
            "status": status,
            "admissions": {"room_number": "101", "access_token": "token1"}
        }

        mock_execute.side_effect = [mock_res1]

        await update_meal_request_status(req_id, status, db=mock_db)

        assert mock_execute.call_count == 1

    asyncio.run(run_test())

def test_update_document_request(mock_db, mock_execute, mock_manager):
    async def run_test():
        req_id = 1
        status = "COMPLETED"

        # 1. Update + Select (single -> dict)
        mock_res1 = MagicMock()
        mock_res1.data = {
            "id": req_id,
            "admission_id": "adm_1",
            "status": status,
            "admissions": {"room_number": "101", "access_token": "token1"}
        }

        mock_execute.side_effect = [mock_res1]

        await update_document_request_status(req_id, status, db=mock_db)

        assert mock_execute.call_count == 1

    asyncio.run(run_test())
