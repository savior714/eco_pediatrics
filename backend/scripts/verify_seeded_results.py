"""
시드 데이터 검증. 표준 logger 사용.
"""
import asyncio
import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(_BACKEND_DIR / ".env")

from database import init_supabase
from logger import logger


async def verify_seeded_data() -> None:
    db = await init_supabase()
    try:
        res = await db.table("admissions").select("*").order("check_in_at", desc=True).limit(5).execute()
        admissions = res.data or []
        logger.info("\n" + "=" * 80)
        logger.info(f"{'이름':<10} | {'병실':<6} | {'체온':<6} | {'수액':<6} | {'검사':<6} | {'식단':<6}")
        logger.info("-" * 80)
        for a in admissions:
            m_res = await db.table("meal_requests").select("id", count="exact").eq("admission_id", a["id"]).execute()
            logger.info(f"Room {a.get('room_number')}: Meals={m_res.count}")
        logger.info("=" * 80 + "\n")
    except Exception as e:
        logger.error(f"Error during verification: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(verify_seeded_data())
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
