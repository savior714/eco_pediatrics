import asyncio
import os
from dotenv import load_dotenv
from supabase._async.client import create_client

load_dotenv()

async def investigate_token(token):
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    supabase = await create_client(url, key)
    
    print(f"🔍 Investigating Token: {token}")
    
    # Check if exists at all
    res = await supabase.table("admissions").select("*").eq("access_token", token).execute()
    if not res.data:
        print("❌ Token not found in 'admissions' table.")
        
        # Maybe it's in a different case? (Unlikely for UUID)
        return

    for row in res.data:
        print(f"✅ Found Admission!")
        print(f"   - ID: {row['id']}")
        print(f"   - Room: {row['room_number']}")
        print(f"   - Status: {row['status']}")
        print(f"   - Name Masked: {row['patient_name_masked']}")
        
    # Check if the logic in main.py would fail
    status = res.data[0]['status']
    if status not in ["IN_PROGRESS", "OBSERVATION"]:
        print(f"⚠️ Status '{status}' is NOT in ['IN_PROGRESS', 'OBSERVATION']. This is why it returns 404.")

if __name__ == "__main__":
    import sys
    target_token = "ccef0fd3-f81d-497d-8ac1-4a9b6669afb0"
    asyncio.run(investigate_token(target_token))
