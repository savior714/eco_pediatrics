import asyncio
import os
from dotenv import load_dotenv
from supabase._async.client import create_client

load_dotenv()

async def verify_endpoint():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        print("❌ Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
        return

    supabase = await create_client(url, key)
    
    # 1. Get a valid token
    res = await supabase.table("admissions").select("access_token, room_number").eq("status", "IN_PROGRESS").limit(1).execute()
    if not res.data:
        print("❌ Error: No active admissions found for testing.")
        return
    
    token = res.data[0]['access_token']
    room = res.data[0]['room_number']
    print(f"✅ Found active admission: Room {room}, Token: {token}")

    # 2. Test the endpoint logic (since the server might not be running in this env)
    # We simulate the logic inside main.py
    print(f"🔍 Verifying logic for token: {token}")
    
    # Query by token
    res_t = await supabase.table("admissions").select("id").eq("access_token", token).eq("status", "IN_PROGRESS").limit(1).execute()
    if res_t.data:
        admission_id = res_t.data[0]['id']
        print(f"✅ Logic check 1 passed: Token resolved to ID {admission_id}")
        
        # Verify dashboard data fetch logic
        print("🔍 Fetching full dashboard data...")
        adm = await supabase.table("admissions").select("*").eq("id", admission_id).execute()
        vitals = await supabase.table("vital_signs").select("*").eq("admission_id", admission_id).limit(5).execute()
        exams = await supabase.table("exam_schedules").select("*").eq("admission_id", admission_id).execute()
        
        print(f"📊 Results:")
        print(f"   - Patient: {adm.data[0]['patient_name_masked']}")
        print(f"   - Vitals: {len(vitals.data)} items")
        print(f"   - Exams: {len(exams.data)} items")
        print("✅ Logic check 2 passed: All data categories fetched successfully.")
    else:
        print("❌ Error: Logic check failed. Token could not be resolved.")

if __name__ == "__main__":
    asyncio.run(verify_endpoint())
