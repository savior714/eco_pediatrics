import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key or "your_" in url:
    print("❌ Error: Please set SUPABASE_URL and SUPABASE_KEY in backend/.env first!")
    exit(1)

supabase: Client = create_client(url, key)

async def seed():
    print("🌱 Seeding data to Supabase...")

    # 1. Create a Dummy Patient (Admission)
    print("   Creating dummy patient '이*원'...")
    try:
        # Calculate start time (6 days ago at 09:00 AM)
        from datetime import timedelta
        base_time = datetime.now() - timedelta(days=6)
        check_in_time = base_time.replace(hour=9, minute=0, second=0, microsecond=0)

        data, count = supabase.table("admissions").insert({
            "patient_name_masked": "김*아",
            "room_number": "310-1",
            "status": "IN_PROGRESS",
            "check_in_at": check_in_time.isoformat()
        }).execute()
        
        admission_id = data[1][0]['id']
        token = data[1][0]['access_token']
        
        print(f"   ✅ Patient created! ID: {admission_id}")
        
        # 2. Add vital signs for 6 days with fever pattern
        print("   Adding fever pattern vital signs (6 days)...")
        vitals = []
        import random
        
        for day in range(7): # 0 to 6
            for hour in range(0, 24, 4): # Every 4 hours
                record_time = check_in_time + timedelta(days=day, hours=hour)
                if record_time > datetime.now():
                    break
                
                # Temperature logic
                med_type = None
                if day <= 1: # Day 1-2: High fever
                    temp = random.uniform(38.5, 39.8)
                    has_med = True if temp > 39.0 else random.choice([True, False, False])
                    if has_med:
                        med_type = random.choice(['A', 'I'])
                elif day == 2: # Day 3: Gradually dropping
                    temp = random.uniform(37.5, 38.5)
                    has_med = random.choice([True, False, False, False])
                    if has_med:
                        med_type = random.choice(['A', 'I'])
                else: # Day 4-6: Normal
                    temp = random.uniform(36.4, 37.2)
                    has_med = False

                vitals.append({
                    "admission_id": admission_id,
                    "temperature": round(temp, 1),
                    "has_medication": has_med,
                    "medication_type": med_type,
                    "recorded_at": record_time.isoformat()
                })

        supabase.table("vital_signs").insert(vitals).execute()
        print(f"   ✅ {len(vitals)} vitals added!")

        # 3. Add IV Record
        print("   Adding mock IV record...")
        supabase.table("iv_records").insert({
            "admission_id": admission_id,
            "infusion_rate": 40,
            "photo_url": "https://placehold.co/600x400/png?text=IV+Check" 
        }).execute()
        print("   ✅ IV record added!")
        
        print("\n" + "="*50)
        port = os.environ.get("FRONTEND_PORT", "3000")
        print("🎉 Seeding Complete!")
        print(f"👉 Guardian Dashboard URL: http://localhost:{port}/dashboard/{token}")
        print(f"   (Note: If Frontend runs on a different port like 3001, please update the URL manually)")
        print("="*50)

    except Exception as e:
        print(f"❌ Error during seeding: {e}")

if __name__ == "__main__":
    asyncio.run(seed())
