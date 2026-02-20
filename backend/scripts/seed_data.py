"""
시드 데이터 생성. 표준 logger 사용.
"""
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(_BACKEND_DIR / ".env")

from logger import logger
from supabase import create_client


def _run_with_retry(func, name: str, retries: int = 3):
    for i in range(retries):
        try:
            return func()
        except Exception as e:
            if i == retries - 1:
                raise e
            logger.warning(f"{name} failed, retrying ({i+1}/{retries})...")
            time.sleep(2)
    return None


def seed() -> None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key or "your_" in url:
        logger.error("Set SUPABASE_URL and SUPABASE_KEY in backend/.env first.")
        return

    supabase = create_client(url, key)
    logger.info("Seeding data to Supabase...")
    logger.info("Creating dummy patient '이*원'...")
    try:
        base_time = datetime.now() - timedelta(days=6)
        check_in_time = base_time.replace(hour=9, minute=0, second=0, microsecond=0)
        res = _run_with_retry(
            lambda: supabase.table("admissions").insert({
                "patient_name_masked": "김*아",
                "room_number": "310-1",
                "status": "IN_PROGRESS",
                "check_in_at": check_in_time.isoformat(),
            }).execute(),
            "Admission",
        )
        if not res or not res.data:
            raise RuntimeError("Admission insert returned no data")
        admission_id = res.data[0]["id"]
        token = res.data[0]["access_token"]
        logger.info(f"Patient created! ID: {admission_id}")
        logger.info("Adding fever pattern vital signs (6 days)...")
        import random
        vitals: list[dict] = []
        for day in range(7):
            for hour in range(0, 24, 4):
                record_time = check_in_time + timedelta(days=day, hours=hour)
                if record_time > datetime.now():
                    break
                if day <= 1:
                    temp = random.uniform(38.5, 39.8)
                    has_med = temp > 39.0 or random.choice([True, False, False])
                elif day == 2:
                    temp = random.uniform(37.5, 38.5)
                    has_med = random.choice([True, False, False, False])
                else:
                    temp = random.uniform(36.4, 37.2)
                    has_med = False
                med_type = random.choice(["A", "I"]) if has_med and day <= 2 else None
                vitals.append({
                    "admission_id": admission_id,
                    "temperature": round(temp, 1),
                    "has_medication": has_med,
                    "medication_type": med_type,
                    "recorded_at": record_time.isoformat(),
                })
        _run_with_retry(lambda: supabase.table("vital_signs").insert(vitals).execute(), "Vital Signs")
        logger.info(f"{len(vitals)} vitals added!")
        logger.info("Adding mock IV record...")
        _run_with_retry(
            lambda: supabase.table("iv_records").insert({
                "admission_id": admission_id,
                "infusion_rate": 40,
                "photo_url": "https://placehold.co/600x400/png?text=IV+Check",
            }).execute(),
            "IV Record",
        )
        logger.info("IV record added!")
        port = os.environ.get("FRONTEND_PORT", "3000")
        logger.info("Seeding Complete!")
        logger.info(f"Guardian Dashboard URL: http://localhost:{port}/dashboard/{token}")
    except Exception as e:
        logger.exception(f"Error during seeding: {e}")


if __name__ == "__main__":
    seed()
