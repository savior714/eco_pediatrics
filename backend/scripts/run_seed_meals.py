"""
meal_requests 직접 INSERT 시드. 표준 logger 사용.
"""
import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(_BACKEND_DIR / ".env")

from database import init_supabase
from logger import logger


async def run_seed_direct() -> None:
    db = await init_supabase()
    res_all = await db.table("admissions").select("id").in_("status", ["IN_PROGRESS", "OBSERVATION"]).execute()
    admissions = res_all.data or []
    meal_records: list[dict] = []
    for adm in admissions:
        for d in range(3):
            date = (datetime.utcnow() + timedelta(hours=9) + timedelta(days=d)).date().isoformat()
            for mt in ["BREAKFAST", "LUNCH", "DINNER"]:
                meal_records.append({
                    "admission_id": adm["id"],
                    "meal_date": date,
                    "meal_time": mt,
                    "request_type": "REGULAR",
                    "pediatric_meal_type": "일반식",
                    "guardian_meal_type": "보호자식" if mt != "BREAKFAST" else "안함",
                    "status": "APPROVED",
                })
    logger.info(f"Attempting direct INSERT of {len(meal_records)} records...")
    try:
        res = await db.table("meal_requests").insert(meal_records).execute()
        logger.info(f"Direct INSERT Success: {len(res.data) if res.data else 0} records inserted.")
    except Exception as e:
        logger.error(f"Direct INSERT FAILED: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(run_seed_direct())
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
