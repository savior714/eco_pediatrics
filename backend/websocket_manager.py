from fastapi import WebSocket
from typing import List, Dict
import asyncio

from loguru import logger

class ConnectionManager:
    def __init__(self):
        # active_connections: Maps access_token to a list of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, token: str):
        await websocket.accept()
        if token not in self.active_connections:
            self.active_connections[token] = []
        self.active_connections[token].append(websocket)
        logger.info(f"Client connected. Token: {token}. Active clients for token: {len(self.active_connections[token])}")

    def disconnect(self, websocket: WebSocket, token: str):
        if token in self.active_connections:
            if websocket in self.active_connections[token]:
                self.active_connections[token].remove(websocket)
                logger.info(f"Client disconnected. Token: {token}")
            if not self.active_connections[token]:
                del self.active_connections[token]

    async def _send_with_timeout(self, websocket: WebSocket, message: str, timeout: float = 2.0) -> WebSocket | None:
        try:
            await asyncio.wait_for(websocket.send_text(message), timeout=timeout)
            return None
        except Exception:
            return websocket

    async def broadcast(self, message: str, token: str):
        if token in self.active_connections:
            # Broadcast to specific token connections (including STATION)
            connections = self.active_connections[token]
            tasks = [self._send_with_timeout(conn, message) for conn in connections]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            to_remove = []
            for res in results:
                # If helper returned a WebSocket, it failed
                if isinstance(res, WebSocket):
                    to_remove.append(res)
            
            if to_remove and token in self.active_connections:
                for dead_conn in to_remove:
                    if dead_conn in self.active_connections[token]:
                        self.active_connections[token].remove(dead_conn)

                if not self.active_connections[token]:
                    del self.active_connections[token]
        else:
            logger.debug(f"No active connections for token: {token}. Skipping broadcast.")

    async def broadcast_all(self, message: str):
        for token, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass

manager = ConnectionManager()
