"""
중복 입원 퇴원(특정 토큰). 표준 logger 사용.
"""
import os
import sys
from datetime import datetime
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(_BACKEND_DIR / ".env")

from logger import logger
from supabase import create_client


def cleanup_duplicates() -> None:
    target_token = "1db291b9-8d17-4a61-a5eb-b8e46c0a3c2d"
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set.")
        return
    supabase = create_client(url, key)
    logger.info("Cleaning up Duplicate Admissions (target token)")
    logger.info(f"Discharging admission with token: {target_token[:8]}...")
    res = supabase.table("admissions").update({
        "status": "DISCHARGED",
        "discharged_at": datetime.now().isoformat(),
    }).eq("access_token", target_token).execute()
    logger.info(f"Result: {res.data}")
    logger.info("Done. Users with old token will now see 'Discharged' or be forced to re-scan.")


if __name__ == "__main__":
    try:
        cleanup_duplicates()
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
