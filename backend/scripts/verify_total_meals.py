"""
meal_requests 테이블 건수/샘플 검사. 표준 logger 사용.
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

from database import init_supabase
from logger import logger
from utils import execute_with_retry_async


async def check_total_meals() -> None:
    db = await init_supabase()
    res_count = await execute_with_retry_async(db.table("meal_requests").select("id", count="exact"))
    logger.info(f"Total meal records in the whole table: {res_count.count}")

    if res_count.count and res_count.count > 0:
        res_sample = await execute_with_retry_async(db.table("meal_requests").select("*").limit(1))
        if res_sample.data:
            logger.info(f"Sample record: {res_sample.data[0]}")
    else:
        logger.warning("THE TABLE IS EMPTY!")


if __name__ == "__main__":
    try:
        asyncio.run(check_total_meals())
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
