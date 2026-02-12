import os
import asyncio
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
        data, count = supabase.table("admissions").insert({
            "patient_name_masked": "이*원",
            "room_number": 201,
            "status": "IN_PROGRESS"
        }).execute()
        
        admission_id = data[1][0]['id']
        token = data[1][0]['access_token']
        
        print(f"   ✅ Patient created! ID: {admission_id}")
        
        # 2. Add some vital signs
        print("   Adding mock vital signs...")
        supabase.table("vital_signs").insert([
            {"admission_id": admission_id, "temperature": 37.8, "recorded_at": "2023-10-27T10:00:00Z"},
            {"admission_id": admission_id, "temperature": 38.2, "recorded_at": "2023-10-27T11:00:00Z"},
            {"admission_id": admission_id, "temperature": 38.5, "recorded_at": "2023-10-27T12:00:00Z"},
            {"admission_id": admission_id, "temperature": 37.9, "has_medication": True, "recorded_at": "2023-10-27T13:00:00Z"},
            {"admission_id": admission_id, "temperature": 37.2, "recorded_at": "2023-10-27T14:00:00Z"},
        ]).execute()
        print("   ✅ Vitals added!")

        # 3. Add IV Record
        print("   Adding mock IV record...")
        supabase.table("iv_records").insert({
            "admission_id": admission_id,
            "infusion_rate": 60,
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
