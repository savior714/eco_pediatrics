import asyncio
import sys
import os

# Add backend to path to import local modules
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import init_supabase
from utils import execute_with_retry_async

async def check_total_meals():
    db = await init_supabase()
    
    # Check total count in the table
    res_count = await execute_with_retry_async(db.table("meal_requests").select("id", count="exact"))
    print(f"Total meal records in the whole table: {res_count.count}")
    
    if res_count.count > 0:
        # Sample one record to see its admission_id
        res_sample = await execute_with_retry_async(db.table("meal_requests").select("*").limit(1))
        if res_sample.data:
            print(f"Sample record: {res_sample.data[0]}")
    else:
        print("THE TABLE IS EMPTY!")

if __name__ == "__main__":
    asyncio.run(check_total_meals())
