from fastapi import WebSocket
from typing import List, Dict

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
            # Broadcast to specific token connections (including STATION)
            to_remove = []
            for connection in self.active_connections[token]:
                try:
                    await connection.send_text(message)
                except Exception:
                    to_remove.append(connection)
            
            for dead_conn in to_remove:
                self.active_connections[token].remove(dead_conn)
                if not self.active_connections[token]:
                    del self.active_connections[token]
        else:
            logger.debug(f"No active connections for token: {token}. Skipping broadcast.")

manager = ConnectionManager()
