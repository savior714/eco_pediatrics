"""
DB 연결 및 exam_schedules 테이블 존재 확인. 표준 logger 사용.
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


def main() -> None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("DB connection failed: missing SUPABASE_URL or SUPABASE_KEY")
        return
    supabase = create_client(url, key)
    try:
        res = supabase.table("exam_schedules").select("id").limit(1).execute()
        logger.info("Table exists")
    except Exception as e:
        logger.error(f"Error: {e}")


if __name__ == "__main__":
    main()
