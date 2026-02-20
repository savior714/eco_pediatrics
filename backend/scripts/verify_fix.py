"""
대시보드 토큰/엔드포인트 로직 검증. 표준 logger 사용.
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


async def verify_endpoint() -> None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL or SUPABASE_KEY not found in .env")
        return
    supabase = await create_client(url, key)
    res = await supabase.table("admissions").select("access_token, room_number").eq("status", "IN_PROGRESS").limit(1).execute()
    if not res.data:
        logger.warning("No active admissions found for testing.")
        return
    token = res.data[0]["access_token"]
    room = res.data[0]["room_number"]
    logger.info(f"Found active admission: Room {room}")
    logger.info(f"Verifying logic for token: {token[:8]}...")
    res_t = await supabase.table("admissions").select("id").eq("access_token", token).eq("status", "IN_PROGRESS").limit(1).execute()
    if res_t.data:
        admission_id = res_t.data[0]["id"]
        logger.info(f"Logic check 1 passed: Token resolved to ID {admission_id}")
        logger.info("Fetching full dashboard data...")
        adm = await supabase.table("admissions").select("*").eq("id", admission_id).execute()
        vitals = await supabase.table("vital_signs").select("*").eq("admission_id", admission_id).limit(5).execute()
        exams = await supabase.table("exam_schedules").select("*").eq("admission_id", admission_id).execute()
        logger.info(f"Results: Patient={adm.data[0]['patient_name_masked']}, Vitals={len(vitals.data)} items, Exams={len(exams.data)} items")
        logger.info("Logic check 2 passed: All data categories fetched successfully.")
    else:
        logger.error("Logic check failed. Token could not be resolved.")


if __name__ == "__main__":
    try:
        asyncio.run(verify_endpoint())
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
