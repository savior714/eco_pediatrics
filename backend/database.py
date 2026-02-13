import os
from supabase._async.client import create_client, AsyncClient
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

# Global client placeholder
supabase: AsyncClient = None

async def init_supabase():
    global supabase
    if url and key:
        supabase = await create_client(url, key)
    return supabase
