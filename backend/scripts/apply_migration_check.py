"""
마이그레이션 SQL 확인. 표준 logger 사용.
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


async def apply_migration() -> None:
    await init_supabase()
    sql_path = _BACKEND_DIR / "migrations" / "fix_meal_requests_rpc.sql"
    if not sql_path.exists():
        logger.warning(f"Migration file not found: {sql_path}")
        return
    sql = sql_path.read_text(encoding="utf-8")
    logger.info(f"Applying migration from {sql_path}...")
    logger.info("Migration SQL (Last few lines):\n" + "\n".join(sql.splitlines()[-5:]))


if __name__ == "__main__":
    try:
        asyncio.run(apply_migration())
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
