import asyncio
import os
from supabase._async.client import create_client, AsyncClient
from datetime import datetime, timedelta

async def check_specific_meals():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    db: AsyncClient = await create_client(url, key)

    target_id = "07662df9-c852-409e-b816-b6017e6a4658" # From mentor's info
    
    print(f"Checking meals for admission_id: {target_id}")
    
    res = await db.table("meal_requests").select("*").eq("admission_id", target_id).execute()
    meals = res.data or []
    
    print(f"Found {len(meals)} meal records.")
    for m in meals:
        print(f"- ID: {m['id']}, Date: {m['meal_date']}, Time: {m['meal_time']}, Status: {m['status']}, Pediatric: {m['pediatric_meal_type']}")

    # Also check active admissions
    adm_res = await db.table("admissions").select("id, room_number, patient_name_masked, status").eq("id", target_id).execute()
    if adm_res.data:
        print(f"Admission Status: {adm_res.data[0]}")
    else:
        print("Admission NOT FOUND in DB!")

if __name__ == "__main__":
    asyncio.run(check_specific_meals())
