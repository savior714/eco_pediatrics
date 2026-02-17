import os
from supabase._async.client import create_client, AsyncClient
from dotenv import load_dotenv

# Load .env from backend directory when run as module (e.g. uvicorn main:app)
_load_env = os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_KEY")
if not _load_env:
    _backend_dir = os.path.dirname(os.path.abspath(__file__))
    load_dotenv(os.path.join(_backend_dir, ".env"))
else:
    load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError(
        "SUPABASE_URL and SUPABASE_KEY must be set. "
        "Copy backend/.env.example to backend/.env and set your Supabase project URL and anon key "
        "(Supabase Dashboard → Project Settings → API)."
    )

# Global client placeholder
supabase: AsyncClient = None

async def init_supabase():
    global supabase
    if not supabase:
        supabase = await create_client(url, key)
    return supabase
