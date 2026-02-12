import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def fix_timestamp():
    # Target "김*아" in "310-1"
    response = supabase.table("admissions").select("*").eq("patient_name_masked", "김*아").eq("room_number", "310-1").execute()
    if not response.data:
        print("Patient not found")
        return
    
    for adm in response.data:
        vitals = supabase.table("vital_signs").select("recorded_at").eq("admission_id", adm['id']).order("recorded_at").limit(1).execute()
        if vitals.data:
            first_recorded = vitals.data[0]['recorded_at']
            print(f"Updating {adm['patient_name_masked']} ID: {adm['id']} check_in_at to {first_recorded}")
            supabase.table("admissions").update({"check_in_at": first_recorded}).eq("id", adm['id']).execute()
            print("Successfully updated!")

if __name__ == "__main__":
    fix_timestamp()
