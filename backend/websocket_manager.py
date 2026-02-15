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

    async def broadcast(self, message: str, token: str):
        if token in self.active_connections:
            connections = self.active_connections[token]
            to_remove = []

            async def send(connection):
                try:
                    # 2 second timeout to prevent blocking
                    await asyncio.wait_for(connection.send_text(message), timeout=2.0)
                    return None
                except Exception:
                    return connection

            # Parallel send with timeout (Phase B)
            if connections:
                results = await asyncio.gather(*(send(conn) for conn in connections), return_exceptions=True)

                for res in results:
                    if isinstance(res, WebSocket):
                        to_remove.append(res)
            
            # Cleanup dead connections
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
