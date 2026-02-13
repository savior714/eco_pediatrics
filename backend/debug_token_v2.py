import asyncio
import os
from dotenv import load_dotenv
from supabase._async.client import create_client

load_dotenv()

async def investigate_token(token):
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    supabase = await create_client(url, key)
    
    res = await supabase.table("admissions").select("id, room_number, status").eq("access_token", token).execute()
    if not res.data:
        print(f"TOKEN_NOT_FOUND: {token}")
        return

    row = res.data[0]
    print(f"TOKEN_FOUND|ID:{row['id']}|ROOM:{row['room_number']}|STATUS:{row['status']}")

if __name__ == "__main__":
    target_token = "ccef0fd3-f81d-497d-8ac1-4a9b6669afb0"
    asyncio.run(investigate_token(target_token))
