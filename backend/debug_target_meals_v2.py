import asyncio
import sys
import os

# Add backend to path to import local modules
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import init_supabase, supabase
from utils import execute_with_retry_async

async def full_scan():
    db = await init_supabase()
    res_all = await execute_with_retry_async(db.table("admissions").select("*").in_("status", ["IN_PROGRESS", "OBSERVATION"]))
    admissions = res_all.data or []
    
    with open('backend/full_scan_report.txt', 'w', encoding='utf-8') as f:
        f.write(f"Total active admissions: {len(admissions)}\n")
        f.write("-" * 50 + "\n")
        
        for adm in admissions:
            aid = adm['id']
            room = adm['room_number']
            name = adm['patient_name_masked']
            token = adm['access_token']
            status = adm['status'] # Added status
            
            res_m = await execute_with_retry_async(db.table("meal_requests").select("id", count="exact").eq("admission_id", aid))
            f.write(f"Room: {room} | Name: {name} | Status: {status} | ID: {aid} | Token: {token} | Meals: {res_m.count}\n")

if __name__ == "__main__":
    asyncio.run(full_scan())
