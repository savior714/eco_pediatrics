"""
310-1 병실 중복 입원 퇴원 유틸리티. 표준 logger 사용.
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


def discharge_stale_admissions() -> None:
    room = "310-1"
    logger.info(f"Discharging stale admissions for room: {room}")

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set.")
        return

    supabase = create_client(url, key)
    res = supabase.table("admissions").select("*").eq("room_number", room).eq("status", "IN_PROGRESS").order("check_in_at", desc=True).execute()
    all_adms = res.data

    if not all_adms or len(all_adms) <= 1:
        logger.info("No duplicates found or only 1 active admission exists.")
        return

    newest = all_adms[0]
    stales = all_adms[1:]
    logger.info(f"Keeping newest: ID={newest['id']}")

    for stale in stales:
        logger.info(f"Discharging stale: ID={stale['id']}")
        supabase.table("admissions").update({
            "status": "DISCHARGED",
            "discharged_at": datetime.now().isoformat(),
        }).eq("id", stale["id"]).execute()

    logger.info("Done. All stale admissions discharged.")


if __name__ == "__main__":
    try:
        discharge_stale_admissions()
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
