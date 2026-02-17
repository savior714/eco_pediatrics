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
        # Safely get current connections (copy list to avoid mutation issues during iteration if needed, though here we just read)
        # Note: active_connections might change during await
        connections = self.active_connections.get(token)

        if connections:
            # We work on a snapshot of connections to initiate sends
            # But we must be careful when modifying self.active_connections after await
            current_connections_snapshot = list(connections)
            to_remove = []

            async def send(connection):
                try:
                    # 2 second timeout to prevent blocking
                    await asyncio.wait_for(connection.send_text(message), timeout=2.0)
                    return None
                except Exception:
                    return connection

            # Parallel send with timeout (Phase B)
            if current_connections_snapshot:
                results = await asyncio.gather(*(send(conn) for conn in current_connections_snapshot), return_exceptions=True)

                for i, res in enumerate(results):
                    # If res is a WebSocket (returned by send() on error) or an Exception (raised during gather), mark it for removal
                    if isinstance(res, (WebSocket, Exception)):
                        to_remove.append(current_connections_snapshot[i])
                    elif res is not None:
                        # Should not happen with current send() logic, but for robustness
                        to_remove.append(current_connections_snapshot[i])
            
            # Cleanup dead connections
            # Re-check if token still exists in active_connections because it might have been removed during await
            if token in self.active_connections:
                live_list = self.active_connections[token]
                for dead_conn in to_remove:
                    if dead_conn in live_list:
                        live_list.remove(dead_conn)

                if not live_list:
                    del self.active_connections[token]
        else:
            logger.debug(f"No active connections for token: {token}. Skipping broadcast.")

    async def broadcast_all(self, message: str):
        """Broadcast to all active connections across all tokens and cleanup dead ones"""
        tokens_to_clean = []
        
        # Iterate over a copy of items to avoid dictionary mutation during await
        for token, connections in list(self.active_connections.items()):
            to_remove = []
            current_connections = list(connections)
            
            async def send_and_capture(connection):
                try:
                    await asyncio.wait_for(connection.send_text(message), timeout=2.0)
                    return None
                except Exception:
                    return connection

            if current_connections:
                results = await asyncio.gather(*(send_and_capture(conn) for conn in current_connections), return_exceptions=True)
                
                for i, res in enumerate(results):
                    if isinstance(res, (WebSocket, Exception)):
                        to_remove.append(current_connections[i])
            
            # Application of cleanup for this specific token
            if to_remove and token in self.active_connections:
                live_list = self.active_connections[token]
                for dead_conn in to_remove:
                    if dead_conn in live_list:
                        live_list.remove(dead_conn)
                
                if not live_list:
                    tokens_to_clean.append(token)
        
        # Final cleanup for empty tokens
        for token in tokens_to_clean:
            if token in self.active_connections and not self.active_connections[token]:
                del self.active_connections[token]

manager = ConnectionManager()
