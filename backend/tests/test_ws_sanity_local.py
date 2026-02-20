import asyncio
import pytest
import sys
import os
from unittest.mock import MagicMock

# Mock classes to simulate WebSocket behavior without running full server
class MockWebSocket:
    def __init__(self, name):
        self.name = name
        self.accepted = False
        self.messages = []

    async def accept(self):
        self.accepted = True
        mock_logger.info(f"[{self.name}] Accepted")

    async def send_text(self, data):
        self.messages.append(data)
        mock_logger.info(f"[{self.name}] Received: {data}")

# Mock loguru before importing backend modules
mock_logger = MagicMock()
sys.modules["loguru"] = MagicMock()
sys.modules["loguru"].logger = mock_logger

# Add backend path to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from websocket_manager import manager

@pytest.mark.anyio
@pytest.mark.parametrize("anyio_backend", ["asyncio"])
async def test_sanity(anyio_backend):
    mock_logger.info("--- Starting WebSocket Sanity Test ---")
    
    # 1. Connect STATION client
    ws_station = MockWebSocket("STATION_CLIENT")
    await manager.connect(ws_station, "STATION")
    
    # 2. Connect Normal client
    ws_patient = MockWebSocket("PATIENT_CLIENT")
    await manager.connect(ws_patient, "TOKEN_123")
    
    # 3. Verify Active Connections
    mock_logger.info(f"Active Tokens: {list(manager.active_connections.keys())}")
    assert "STATION" in manager.active_connections
    assert "TOKEN_123" in manager.active_connections
    
    # 4. Broadcast to STATION (The bug fix verification)
    mock_logger.info("Broadcasting to STATION...")
    await manager.broadcast("Hello Station", "STATION")
    assert "Hello Station" in ws_station.messages, "Station did not receive message"
        
    # 5. Broadcast to Patient
    mock_logger.info("Broadcasting to TOKEN_123...")
    await manager.broadcast("Hello Patient", "TOKEN_123")
    assert "Hello Patient" in ws_patient.messages, "Patient did not receive message"

    mock_logger.info("--- Test passed! ---")

if __name__ == "__main__":
    asyncio.run(test_sanity("asyncio"))
