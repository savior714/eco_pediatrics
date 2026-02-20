"""
Supabase 키 역할 및 exam_schedules 가시성 확인. 표준 logger 사용.
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

try:
    import jwt
except ImportError:
    jwt = None


def check_key() -> None:
    logger.info("Checking Supabase Key Role")
    key = os.environ.get("SUPABASE_KEY")
    if not key:
        logger.warning("No SUPABASE_KEY found in env.")
        return
    if jwt:
        try:
            decoded = jwt.decode(key, options={"verify_signature": False})
            role = decoded.get("role")
            logger.info(f"Key Role: {role}")
        except Exception as e:
            logger.error(f"Failed to decode key: {e}")
    url = os.environ.get("SUPABASE_URL")
    if not url or not key:
        logger.warning("Supabase client not configured.")
        return
    logger.info("Checking Exam Schedules Visibility")
    supabase = create_client(url, key)
    res = supabase.table("exam_schedules").select("*").execute()
    data = res.data or []
    logger.info(f"Visible Exam Schedules: {len(data)}")
    for item in data:
        logger.info(f" - {item}")


if __name__ == "__main__":
    try:
        check_key()
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
