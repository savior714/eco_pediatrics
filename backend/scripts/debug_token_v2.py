"""
토큰 조회(간단). 표준 logger 사용.
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
    res = await supabase.table("admissions").select("id, room_number, status").eq("access_token", token).execute()
    if not res.data:
        logger.warning(f"TOKEN_NOT_FOUND: {token[:8]}...")
        return
    row = res.data[0]
    logger.info(f"TOKEN_FOUND|ID:{row['id']}|ROOM:{row['room_number']}|STATUS:{row['status']}")


if __name__ == "__main__":
    try:
        asyncio.run(investigate_token("ccef0fd3-f81d-497d-8ac1-4a9b6669afb0"))
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
