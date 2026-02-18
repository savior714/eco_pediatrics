import asyncio
import sys
import os

# Add backend to path to import local modules
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import init_supabase
from services import dev_service

async def run_seed_direct():
    db = await init_supabase()
    
    res_all = await db.table("admissions").select("id").in_("status", ["IN_PROGRESS", "OBSERVATION"]).execute()
    admissions = res_all.data or []
    
    meal_records = []
    # Create 3-day records for all patients
    for adm in admissions:
        for d in range(3):
            date = (datetime.utcnow() + timedelta(hours=9) + timedelta(days=d)).date().isoformat()
            for mt in ["BREAKFAST", "LUNCH", "DINNER"]:
                meal_records.append({
                    "admission_id": adm['id'],
                    "meal_date": date,
                    "meal_time": mt,
                    "request_type": "REGULAR",
                    "pediatric_meal_type": "일반식",
                    "guardian_meal_type": "보호자식" if mt != "BREAKFAST" else "안함",
                    "status": "APPROVED"
                })
    
    print(f"Attempting direct INSERT of {len(meal_records)} records...")
    try:
        # Note: We use insert(), not upsert(), because RLS for UPDATE is missing.
        # This will fail if records already exist, but our table is empty now.
        res = await db.table("meal_requests").insert(meal_records).execute()
        print(f"Direct INSERT Success: {len(res.data) if res.data else 0} records inserted.")
    except Exception as e:
        print(f"!!! Direct INSERT FAILED !!!: {str(e)}")
        # If it fails due to duplicates, it means some records ARE there but we can't see them?
        # That would confirm RLS invisibility.

if __name__ == "__main__":
    from datetime import datetime, timedelta
    asyncio.run(run_seed_direct())
