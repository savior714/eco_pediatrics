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

    # Manually add connections using a SET
    manager.active_connections[token] = {ws_ok, ws_fail}

    # Broadcast
    await manager.broadcast("hello", token)

    # Verify ws_fail is removed, ws_ok remains
    assert token in manager.active_connections
    assert len(manager.active_connections[token]) == 1
    assert ws_ok in manager.active_connections[token]
    assert ws_fail not in manager.active_connections[token]

@pytest.mark.anyio
@pytest.mark.parametrize("anyio_backend", ["asyncio"])
async def test_broadcast_cleanup_on_timeout(anyio_backend):
    manager = ConnectionManager()

    async def slow_send(msg):
        await asyncio.sleep(5) # Longer than 1.5s timeout

    ws_timeout = MagicMock(spec=WebSocket)
    ws_timeout.send_text = AsyncMock(side_effect=slow_send)

    token = "timeout_token"
    manager.active_connections[token] = {ws_timeout}

    # Broadcast
    await manager.broadcast("hello", token)

    # Verify ws_timeout is removed
    assert token not in manager.active_connections

@pytest.mark.anyio
@pytest.mark.parametrize("anyio_backend", ["asyncio"])
async def test_broadcast_cleanup_on_exception_in_gather(anyio_backend):
    # This test simulates a case where the sub-task itself handles error 
    # but the socket must be removed from the set.
    manager = ConnectionManager()

    ws = MagicMock(spec=WebSocket)
    # Simulate a crash inside send_text
    ws.send_text = AsyncMock(side_effect=RuntimeError("Fatal"))

    token = "fatal_token"
    manager.active_connections[token] = {ws}

    await manager.broadcast("hello", token)

    # Verify ws is removed
    assert token not in manager.active_connections
