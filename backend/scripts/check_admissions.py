"""
입원 및 exam_schedules 목록 확인. 표준 logger 사용.
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


def check_data() -> None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set.")
        return
    supabase = create_client(url, key)
    logger.info("Checking Admissions & Exam Schedules")
    res = supabase.table("admissions").select("*").eq("status", "IN_PROGRESS").execute()
    admissions = res.data or []
    if not admissions:
        logger.info("No active IN_PROGRESS admissions found.")
        return
    logger.info(f"Found {len(admissions)} active admissions.")
    for adm in admissions:
        a_id = adm["id"]
        name = adm["patient_name_masked"]
        room = adm["room_number"]
        token = adm["access_token"]
        exam_res = supabase.table("exam_schedules").select("id", count="exact").eq("admission_id", a_id).execute()
        exam_count = len(exam_res.data or [])
        logger.info(f"[{room}] {name} (ID: {a_id})")
        logger.info(f"    - Token: {token[:8]}...")
        logger.info(f"    - Exam Schedules: {exam_count} items")
        if exam_count > 0 and exam_res.data:
            logger.info(f"      sample: {exam_res.data[0]}")


if __name__ == "__main__":
    try:
        check_data()
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
