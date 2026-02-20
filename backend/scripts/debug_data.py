"""
입원/바이탈 샘플 데이터 출력. 표준 logger 사용.
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
    admissions = supabase.table("admissions").select("*").order("check_in_at", desc=True).limit(5).execute()
    for adm in admissions.data or []:
        logger.info(f"--- {adm['patient_name_masked']} ({adm['room_number']}) ---")
        logger.info(f"ID: {adm['id']}, Token: {adm['access_token'][:8]}..., Check-in: {adm['check_in_at']}")
        vitals = supabase.table("vital_signs").select("*").eq("admission_id", adm["id"]).order("recorded_at").execute()
        logger.info(f"Total Vitals: {len(vitals.data or [])}")
        if vitals.data:
            logger.info(f"First: {vitals.data[0]['recorded_at']}, Last: {vitals.data[-1]['recorded_at']}")


if __name__ == "__main__":
    try:
        check_data()
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
