"""
특정 토큰 입원 상태 확인. 표준 logger 사용.
"""
import os
import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(_BACKEND_DIR / ".env")

from logger import logger
from supabase import create_client


def check_status() -> None:
    token = "83ddc0e6-38ce-44bb-9039-96cb303ff83b"
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set.")
        return
    supabase = create_client(url, key)
    logger.info(f"Checking status for token: {token[:8]}...")
    res = supabase.table("admissions").select("*").eq("access_token", token).execute()
    if res.data:
        adm = res.data[0]
        logger.info(f"ID: {adm['id']}, Room: {adm['room_number']}, Status: {adm['status']}")
    else:
        logger.warning("Token not found.")


if __name__ == "__main__":
    try:
        check_status()
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
