"""
exam_schedules DELETE 테스트. 표준 logger 사용.
"""
import datetime
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


def test_delete() -> None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set.")
        return
    supabase = create_client(url, key)
    logger.info("Testing DELETE on exam_schedules")
    adm = supabase.table("admissions").select("id").limit(1).execute()
    if not adm.data:
        logger.warning("No admissions found to test with.")
        return
    adm_id = adm.data[0]["id"]
    logger.info(f"Using admission: {adm_id}")
    new_exam = {
        "admission_id": adm_id,
        "scheduled_at": datetime.datetime.now().isoformat(),
        "name": "TEST_DELETE_ITEM",
        "note": "To be deleted",
    }
    try:
        res = supabase.table("exam_schedules").insert(new_exam).execute()
        created_id = res.data[0]["id"]
        logger.info(f"Created dummy exam schedule: {created_id}")
    except Exception as e:
        logger.error(f"Failed to create dummy: {e}")
        return
    try:
        logger.info(f"Attempting to delete {created_id}...")
        res = supabase.table("exam_schedules").delete().eq("id", created_id).execute()
        logger.info(f"Delete result: {res.data}")
        if not res.data:
            logger.warning("Delete returned empty data! (Likely RLS blocked)")
        else:
            logger.info("Delete successful!")
    except Exception as e:
        logger.error(f"DELETE FAILED: {e}")


if __name__ == "__main__":
    try:
        test_delete()
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
