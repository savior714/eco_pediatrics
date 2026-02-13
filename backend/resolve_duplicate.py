from database import supabase
from datetime import datetime

def cleanup_duplicates():
    print("=== Cleaning up Duplicate Admissions ===")
    
    # Target older admission for '김*아' (310-1)
    target_token = "1db291b9-8d17-4a61-a5eb-b8e46c0a3c2d"
    
    print(f"Discharging admission with token: {target_token}")
    
    res = supabase.table("admissions").update({
        "status": "DISCHARGED",
        "discharged_at": datetime.now().isoformat()
    }).eq("access_token", target_token).execute()
    
    print(f"Result: {res.data}")
    print("Done. Users with old token will now see 'Discharged' or be forced to re-scan.")

if __name__ == "__main__":
    cleanup_duplicates()
