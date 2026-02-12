import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def check_data():
    admissions = supabase.table("admissions").select("*").order("check_in_at", desc=True).limit(5).execute()
    for adm in admissions.data:
        print(f"--- {adm['patient_name_masked']} ({adm['room_number']}) ---")
        print(f"ID: {adm['id']}")
        print(f"Token: {adm['access_token']}")
        print(f"Check-in At: {adm['check_in_at']}")
        
        vitals = supabase.table("vital_signs").select("*").eq("admission_id", adm['id']).order("recorded_at").execute()
        print(f"Total Vitals: {len(vitals.data)}")
        if vitals.data:
            print(f"First: {vitals.data[0]['recorded_at']}")
            print(f"Last: {vitals.data[-1]['recorded_at']}")
    return
    
    adm = admission.data[0]
    print(f"Admission ID: {adm['id']}")
    print(f"Room Number: {adm['room_number']}")
    print(f"Check-in At: {adm['check_in_at']}")
    
    vitals = supabase.table("vital_signs").select("*").eq("admission_id", adm['id']).order("recorded_at").execute()
    print(f"\nTotal Vital Signs: {len(vitals.data)}")
    if vitals.data:
        print(f"First Record: {vitals.data[0]['recorded_at']} - {vitals.data[0]['temperature']}°C")
        print(f"Last Record: {vitals.data[-1]['recorded_at']} - {vitals.data[-1]['temperature']}°C")

if __name__ == "__main__":
    check_data()
