"""
중복 입원 일괄 퇴원. 표준 logger 사용.
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
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set.")
        return
    supabase = create_client(url, key)
    logger.info("Cleaning up duplicate admissions")
    res = supabase.table("admissions").select("*").eq("status", "IN_PROGRESS").execute()
    admissions = res.data or []
    if not admissions:
        logger.info("No active IN_PROGRESS admissions found.")
        return
    by_room: dict[str, list] = {}
    for adm in admissions:
        room = adm["room_number"]
        if room not in by_room:
            by_room[room] = []
        by_room[room].append(adm)
    total_cleaned = 0
    for room, adms in by_room.items():
        if len(adms) <= 1:
            continue
        logger.info(f"Room {room}: Found {len(adms)} active admissions.")
        adms.sort(key=lambda x: x.get("check_in_at") or "", reverse=True)
        keep = adms[0]
        duplicates = adms[1:]
        logger.info(f"  Keeping: {keep['patient_name_masked']} ({keep['id']}) - {keep['check_in_at']}")
        for dup in duplicates:
            logger.info(f"  Discharging: {dup['patient_name_masked']} ({dup['id']}) - {dup['check_in_at']}")
            try:
                supabase.table("admissions").update({
                    "status": "DISCHARGED",
                    "discharged_at": datetime.now().isoformat(),
                }).eq("id", dup["id"]).execute()
                total_cleaned += 1
            except Exception as e:
                logger.error(f"  Failed to discharge {dup['id']}: {e}")
    logger.info(f"Cleanup Complete. Discharged {total_cleaned} duplicates.")


if __name__ == "__main__":
    try:
        cleanup_duplicates()
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
