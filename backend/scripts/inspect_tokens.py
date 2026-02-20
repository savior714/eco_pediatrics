"""
Token 검사 유틸리티. 표준 logger 사용, backend/scripts에서 실행.
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

def inspect_tokens() -> None:
    token1: str = "1db291b9-8d17-4a61-a5eb-b8e46c0a3c2d"
    token2: str = "2c8d95d5-98f6-48bf-a72c-5ec0f007bb7b"

    logger.info("Starting Token Inspection...")

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set.")
        return

    supabase = create_client(url, key)

    res1 = supabase.table("admissions").select("*").eq("access_token", token1).execute()
    data1 = res1.data
    if data1:
        adm = data1[0]
        logger.info(
            f"Token 1 Found | ID: {adm['id']} | Name: {adm['patient_name_masked']} | Room: {adm['room_number']}"
        )
    else:
        logger.warning(f"Token 1 is invalid or not found: {token1[:8]}...")

    res2 = supabase.table("admissions").select("*").eq("access_token", token2).execute()
    data2 = res2.data
    if data2:
        adm = data2[0]
        logger.info(
            f"Token 2 Found | ID: {adm['id']} | Name: {adm['patient_name_masked']} | Room: {adm['room_number']}"
        )
    else:
        logger.warning(f"Token 2 is invalid or not found: {token2[:8]}...")

    if data1 and data2:
        if data1[0]["room_number"] == data2[0]["room_number"]:
            logger.critical(
                f"Data Integrity Violation: Duplicate active admissions in Room {data1[0]['room_number']}!"
            )
            t1: str = str(data1[0].get("check_in_at") or "")
            t2: str = str(data2[0].get("check_in_at") or "")
            newer: str = "Admission 1" if t1 > t2 else "Admission 2"
            logger.info(f"Check-in Analysis | T1: {t1} | T2: {t2} | Newer: {newer}")


if __name__ == "__main__":
    try:
        inspect_tokens()
    except Exception as e:
        logger.exception(f"Unexpected error during token inspection: {e}")
