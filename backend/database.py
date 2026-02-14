import os
from supabase._async.client import create_client, AsyncClient
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables.")

# Global client placeholder
supabase: AsyncClient = None

async def init_supabase():
    global supabase
    if not supabase:
        supabase = await create_client(url, key)
    return supabase
