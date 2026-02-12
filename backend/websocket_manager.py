from fastapi import WebSocket
from typing import List, Dict

class ConnectionManager:
    def __init__(self):
        # active_connections: Maps access_token to a list of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, token: str):
        await websocket.accept()
        if token not in self.active_connections:
            self.active_connections[token] = []
        self.active_connections[token].append(websocket)

    def disconnect(self, websocket: WebSocket, token: str):
        if token in self.active_connections:
            if websocket in self.active_connections[token]:
                self.active_connections[token].remove(websocket)
            if not self.active_connections[token]:
                del self.active_connections[token]

    async def broadcast(self, message: str, token: str):
        if token in self.active_connections:
            for connection in self.active_connections[token]:
                await connection.send_text(message)

manager = ConnectionManager()
