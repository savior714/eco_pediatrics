"""
대시보드/백엔드 토큰 충돌 검사. 표준 logger 사용.
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


def inspect_and_fix() -> None:
    token_dash = "83ddc0e6-38ce-44bb-9039-96cb303ff83b"
    token_backend = "2c8d95d5-98f6-48bf-a72c-5ec0f007bb7b"
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set.")
        return
    supabase = create_client(url, key)

    logger.info(f"Inspecting Dashboard Token: {token_dash[:8]}...")
    res1 = supabase.table("admissions").select("*").eq("access_token", token_dash).execute()
    adm_dash = res1.data[0] if res1.data else None
    if adm_dash:
        logger.info(f"Dashboard: ID={adm_dash['id']}, Room={adm_dash['room_number']}, Status={adm_dash['status']}")
    else:
        logger.warning("Dashboard Token not found.")

    logger.info(f"Inspecting Backend Token: {token_backend[:8]}...")
    res2 = supabase.table("admissions").select("*").eq("access_token", token_backend).execute()
    adm_backend = res2.data[0] if res2.data else None
    if adm_backend:
        logger.info(f"Backend: ID={adm_backend['id']}, Room={adm_backend['room_number']}, Status={adm_backend['status']}")
    else:
        logger.warning("Backend Token not found.")

    if adm_dash:
        room = adm_dash["room_number"]
        logger.info(f"All Active Admissions for Room {room}")
        all_active = supabase.table("admissions").select("*").eq("room_number", room).eq("status", "IN_PROGRESS").order("check_in_at", desc=True).execute()
        for idx, adm in enumerate(all_active.data or []):
            logger.info(f"[{idx}] ID={adm['id']}, Token={adm['access_token'][:8]}..., Created={adm.get('check_in_at')}")


if __name__ == "__main__":
    try:
        inspect_and_fix()
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
