import asyncio
import pytest
import sys

# Mock classes to simulate WebSocket behavior without running full server
class MockWebSocket:
    def __init__(self, name):
        self.name = name
        self.accepted = False
        self.messages = []

    async def accept(self):
        self.accepted = True
        print(f"[{self.name}] Accepted")

    async def send_text(self, data):
        self.messages.append(data)
        print(f"[{self.name}] Received: {data}")

import sys
import os
from unittest.mock import MagicMock

# Mock loguru before importing backend modules
mock_logger = MagicMock()
sys.modules["loguru"] = MagicMock()
sys.modules["loguru"].logger = mock_logger

# Add backend path to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from websocket_manager import manager

@pytest.mark.anyio
async def test_sanity():
    print("--- Starting WebSocket Sanity Test ---")
    
    # 1. Connect STATION client
    ws_station = MockWebSocket("STATION_CLIENT")
    await manager.connect(ws_station, "STATION")
    
    # 2. Connect Normal client
    ws_patient = MockWebSocket("PATIENT_CLIENT")
    await manager.connect(ws_patient, "TOKEN_123")
    
    # 3. Verify Active Connections
    print(f"Active Tokens: {list(manager.active_connections.keys())}")
    assert "STATION" in manager.active_connections
    assert "TOKEN_123" in manager.active_connections
    
    # 4. Broadcast to STATION (The bug fix verification)
    print("Broadcasting to STATION...")
    try:
        await manager.broadcast("Hello Station", "STATION")
        if "Hello Station" in ws_station.messages:
            print("SUCCESS: Station received message")
        else:
            print("FAILURE: Station did not receive message")
            sys.exit(1)
    except AttributeError as e:
        print(f"CRITICAL FAILURE: AttributeError during broadcast: {e}")
        print("Likely 'station_connections' bug still exists.")
        sys.exit(1)
        
    # 5. Broadcast to Patient
    print("Broadcasting to TOKEN_123...")
    await manager.broadcast("Hello Patient", "TOKEN_123")
    if "Hello Patient" in ws_patient.messages:
        print("SUCCESS: Patient received message")
    else:
        print("FAILURE: Patient did not receive message")
        sys.exit(1)

    print("--- Test Failed? No, it passed! ---")

if __name__ == "__main__":
    asyncio.run(test_sanity())
