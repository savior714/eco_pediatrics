from fastapi import WebSocket
from typing import Set, Dict
import asyncio
from loguru import logger

class ConnectionManager:
    def __init__(self):
        # Maps token -> Set of WebSockets for faster lookup/discard
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, token: str):
        await websocket.accept()
        if token not in self.active_connections:
            self.active_connections[token] = set()
        self.active_connections[token].add(websocket)
        logger.info(f"Connected: {token} (Total: {len(self.active_connections[token])})")

    def disconnect(self, websocket: WebSocket, token: str):
        if token in self.active_connections:
            self.active_connections[token].discard(websocket)
            if not self.active_connections[token]:
                del self.active_connections[token]
        logger.info(f"Disconnected: {token}")

    async def broadcast(self, message: str, token: str):
        if token not in self.active_connections:
            return

        # Snapshot to avoid "Set changed size during iteration"
        live_sockets = list(self.active_connections[token])
        dead_sockets = []

        async def send_safe(ws: WebSocket):
            try:
                await asyncio.wait_for(ws.send_text(message), timeout=1.5)
            except Exception:
                dead_sockets.append(ws)

        if live_sockets:
            await asyncio.gather(*(send_safe(ws) for ws in live_sockets))

        # Atomic cleanup after gather
        if dead_sockets and token in self.active_connections:
            for ws in dead_sockets:
                self.active_connections[token].discard(ws)
            if not self.active_connections[token]:
                del self.active_connections[token]

    async def broadcast_all(self, message: str):
        # Snapshot tokens to avoid mutation issues
        tokens = list(self.active_connections.keys())
        await asyncio.gather(*(self.broadcast(message, t) for t in tokens))

manager = ConnectionManager()
