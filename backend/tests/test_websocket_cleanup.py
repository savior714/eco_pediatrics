import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from fastapi import WebSocket
from websocket_manager import ConnectionManager

@pytest.mark.anyio
@pytest.mark.parametrize("anyio_backend", ["asyncio"])
async def test_broadcast_cleanup_on_failure(anyio_backend):
    manager = ConnectionManager()

    # Mock WebSockets
    ws_ok = MagicMock(spec=WebSocket)
    ws_ok.send_text = AsyncMock()

    ws_fail = MagicMock(spec=WebSocket)
    ws_fail.send_text = AsyncMock(side_effect=Exception("Connection lost"))

    token = "test_token"

    # Manually add connections (avoiding await ws.accept() which is in manager.connect)
    manager.active_connections[token] = [ws_ok, ws_fail]

    # Broadcast
    await manager.broadcast("hello", token)

    # Verify ws_fail is removed, ws_ok remains
    assert len(manager.active_connections[token]) == 1
    assert ws_ok in manager.active_connections[token]
    assert ws_fail not in manager.active_connections[token]

@pytest.mark.anyio
@pytest.mark.parametrize("anyio_backend", ["asyncio"])
async def test_broadcast_cleanup_on_timeout(anyio_backend):
    manager = ConnectionManager()

    async def slow_send(msg):
        await asyncio.sleep(5) # Longer than 2s timeout

    ws_timeout = MagicMock(spec=WebSocket)
    ws_timeout.send_text = AsyncMock(side_effect=slow_send)

    token = "timeout_token"
    manager.active_connections[token] = [ws_timeout]

    # Broadcast
    await manager.broadcast("hello", token)

    # Verify ws_timeout is removed
    assert token not in manager.active_connections

@pytest.mark.anyio
@pytest.mark.parametrize("anyio_backend", ["asyncio"])
async def test_broadcast_cleanup_on_exception_in_gather(anyio_backend):
    # This test simulates an Exception being returned by gather (return_exceptions=True)
    # even if our send() wrapper tries to catch everything.

    manager = ConnectionManager()

    ws = MagicMock(spec=WebSocket)
    # We won't actually call send_text if we mock the whole gather results,
    # but let's just make it a normal mock.
    ws.send_text = AsyncMock()

    token = "gather_exception_token"
    manager.active_connections[token] = [ws]

    # We need to monkeypatch asyncio.gather to return an Exception
    original_gather = asyncio.gather

    async def mock_gather(*aws, **kwargs):
        # We must avoid "coroutine was never awaited" warnings
        for aw in aws:
            try:
                aw.close()
            except:
                pass
        return [Exception("Unexpected error")]

    try:
        asyncio.gather = mock_gather
        await manager.broadcast("hello", token)
    finally:
        asyncio.gather = original_gather

    # Verify ws is removed because gather returned an Exception
    assert token not in manager.active_connections
