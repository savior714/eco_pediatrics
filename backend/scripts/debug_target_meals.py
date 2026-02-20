"""
특정 admission_id 식사 기록 검사. 표준 logger 사용.
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


async def check_specific_meals() -> None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set.")
        return
    db = await create_client(url, key)
    target_id = "07662df9-c852-409e-b816-b6017e6a4658"
    logger.info(f"Checking meals for admission_id: {target_id}")
    res = await db.table("meal_requests").select("*").eq("admission_id", target_id).execute()
    meals = res.data or []
    logger.info(f"Found {len(meals)} meal records.")
    for m in meals:
        logger.info(f"- ID: {m['id']}, Date: {m['meal_date']}, Time: {m['meal_time']}, Status: {m['status']}, Pediatric: {m['pediatric_meal_type']}")
    adm_res = await db.table("admissions").select("id, room_number, patient_name_masked, status").eq("id", target_id).execute()
    if adm_res.data:
        logger.info(f"Admission Status: {adm_res.data[0]}")
    else:
        logger.warning("Admission NOT FOUND in DB!")


if __name__ == "__main__":
    try:
        asyncio.run(check_specific_meals())
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
