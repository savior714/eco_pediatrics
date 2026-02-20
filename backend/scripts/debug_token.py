"""
토큰 상세 조회. 표준 logger 사용.
"""
import asyncio
import os
import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(_BACKEND_DIR / ".env")

from supabase._async.client import create_client
from logger import logger


async def investigate_token(token: str) -> None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set.")
        return
    supabase = await create_client(url, key)
    logger.info(f"Investigating Token: {token[:8]}...")
    res = await supabase.table("admissions").select("*").eq("access_token", token).execute()
    if not res.data:
        logger.warning("Token not found in 'admissions' table.")
        return
    for row in res.data:
        logger.info(f"Found Admission: ID={row['id']}, Room={row['room_number']}, Status={row['status']}, Name={row['patient_name_masked']}")
    status = res.data[0]["status"]
    if status not in ("IN_PROGRESS", "OBSERVATION"):
        logger.warning(f"Status '{status}' is NOT in ['IN_PROGRESS', 'OBSERVATION']. This is why it returns 404.")


if __name__ == "__main__":
    try:
        asyncio.run(investigate_token("ccef0fd3-f81d-497d-8ac1-4a9b6669afb0"))
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
