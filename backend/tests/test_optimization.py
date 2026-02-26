
import sys
import unittest.mock
from unittest.mock import MagicMock, AsyncMock
import asyncio
import os

# --- 1. Patch sys.modules for missing dependencies ---
# Mocks must be created and assigned BEFORE importing the module under test
sys.modules["fastapi"] = MagicMock()
sys.modules["fastapi.middleware.cors"] = MagicMock()
sys.modules["fastapi.staticfiles"] = MagicMock()
sys.modules["fastapi.exceptions"] = MagicMock()
sys.modules["fastapi.responses"] = MagicMock()
sys.modules["starlette.exceptions"] = MagicMock()
sys.modules["supabase"] = MagicMock()
sys.modules["supabase._async.client"] = MagicMock()
sys.modules["uvicorn"] = MagicMock()
sys.modules["websockets"] = MagicMock()
sys.modules["websockets.exceptions"] = MagicMock()
sys.modules["dependencies"] = MagicMock()
sys.modules["logger"] = MagicMock()
sys.modules["utils"] = MagicMock()
sys.modules["services.dashboard"] = MagicMock()
sys.modules["services.station_service"] = MagicMock()
sys.modules["websocket_manager"] = MagicMock()
sys.modules["models"] = MagicMock()
sys.modules["schemas"] = MagicMock()
sys.modules["constants.mappings"] = MagicMock()

# Setup mocks for FastAPI specifics
fastapi_mock = sys.modules["fastapi"]
def mock_depends(dependency=None, use_cache=True):
    return MagicMock()
fastapi_mock.Depends = mock_depends

# Fix APIRouter decorators
mock_router_instance = MagicMock()
def route_decorator(*args, **kwargs):
    def wrapper(func):
        return func
    return wrapper

mock_router_instance.get.side_effect = route_decorator
mock_router_instance.post.side_effect = route_decorator
mock_router_instance.patch.side_effect = route_decorator
mock_router_instance.put.side_effect = route_decorator
mock_router_instance.delete.side_effect = route_decorator

fastapi_mock.APIRouter.return_value = mock_router_instance

# Ensure backend is in path
if "backend" not in sys.path:
    sys.path.append(os.path.join(os.getcwd(), "backend"))

# Re-import to ensure mocks are used
from routers import station

# Wrapper for async tests without pytest-asyncio
def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)
    finally:
        loop.close()

def test_update_document_request_status_calls():
    async def _test():
        # Setup db mock
        mock_db = MagicMock()
        mock_builder = MagicMock()
        mock_db.table.return_value = mock_builder

        # New optimized chain: db.table().update().eq().select().single()
        # Wait, the order in code is:
        # db.table("...").update(...).eq(...).select(...).single()

        mock_update = MagicMock()
        mock_builder.update.return_value = mock_update

        mock_eq = MagicMock()
        mock_update.eq.return_value = mock_eq

        mock_select = MagicMock()
        mock_eq.select.return_value = mock_select

        mock_single = MagicMock()
        mock_select.single.return_value = mock_single # This is what executes

        station.manager = AsyncMock()
        station.manager.broadcast = AsyncMock()

        success_response = MagicMock(data={"id": 1, "status": "COMPLETED", "admissions": {"room_number": "101", "access_token": "token"}})

        call_count = 0
        async def mock_fn(query_obj, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return success_response
            return MagicMock()

        original = station.execute_with_retry_async
        station.execute_with_retry_async = mock_fn

        try:
             await station.update_document_request_status(1, "COMPLETED", mock_db)
             # Optimization success: Should only be called ONCE now!
             assert call_count == 1
        finally:
             station.execute_with_retry_async = original

    run_async(_test())

def test_update_meal_request_status_calls():
    async def _test():
        mock_db = MagicMock()

        mock_builder = MagicMock()
        mock_db.table.return_value = mock_builder

        # New optimized chain
        mock_update = MagicMock()
        mock_builder.update.return_value = mock_update
        mock_eq = MagicMock()
        mock_update.eq.return_value = mock_eq
        mock_select = MagicMock()
        mock_eq.select.return_value = mock_select
        mock_single = MagicMock()
        mock_select.single.return_value = mock_single

        station.manager = AsyncMock()
        station.manager.broadcast = AsyncMock()

        success_response = MagicMock(data={
            "id": 1,
            "admission_id": 999,
            "status": "IN_PROGRESS",
            "admissions": {"room_number": "101", "access_token": "token"}
        })

        call_count = 0
        async def mock_fn(query, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            return success_response

        original = station.execute_with_retry_async
        station.execute_with_retry_async = mock_fn

        try:
            await station.update_meal_request_status(1, "IN_PROGRESS", mock_db)
            # Optimization success: Should only be called ONCE now!
            assert call_count == 1
        finally:
            station.execute_with_retry_async = original

    run_async(_test())

if __name__ == "__main__":
    test_update_document_request_status_calls()
    test_update_meal_request_status_calls()
