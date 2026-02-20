"""
입원 check_in_at 타임스탬프 보정 유틸리티. 표준 logger 사용.
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


def fix_timestamp() -> None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set.")
        return

    supabase = create_client(url, key)
    response = supabase.table("admissions").select("*").eq("patient_name_masked", "김*아").eq("room_number", "310-1").execute()
    if not response.data:
        logger.warning("Patient not found")
        return

    for adm in response.data:
        vitals = supabase.table("vital_signs").select("recorded_at").eq("admission_id", adm["id"]).order("recorded_at").limit(1).execute()
        if vitals.data:
            first_recorded = vitals.data[0]["recorded_at"]
            logger.info(f"Updating {adm['patient_name_masked']} ID: {adm['id']} check_in_at to {first_recorded}")
            supabase.table("admissions").update({"check_in_at": first_recorded}).eq("id", adm["id"]).execute()
            logger.info("Successfully updated.")


if __name__ == "__main__":
    try:
        fix_timestamp()
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
