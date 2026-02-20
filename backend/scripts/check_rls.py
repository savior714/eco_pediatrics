"""
RLS 정책 안내 및 exam_schedules 읽기 확인. 표준 logger 사용.
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


def apply_policies() -> None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set.")
        return
    supabase = create_client(url, key)
    logger.info("Applying Permissive RLS Policies (instructions)")
    sql = """
    -- Run this in Supabase SQL Editor
    CREATE POLICY "Enable all access for exam_schedules" ON public.exam_schedules FOR ALL USING (true) WITH CHECK (true);
    """
    logger.info("Please ensure the following policy exists if you are using Anon key:")
    logger.info(sql)
    logger.info("Checking if we can read exam schedules...")
    try:
        res = supabase.table("exam_schedules").select("*").limit(1).execute()
        logger.info(f"Read success. Count: {len(res.data)} items.")
    except Exception as e:
        logger.error(f"Read failed: {e}")


if __name__ == "__main__":
    try:
        apply_policies()
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
