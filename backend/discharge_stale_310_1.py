from database import supabase
from datetime import datetime

def discharge_stale_admissions():
    room = "310-1"
    print(f"=== Discharging Stale Admissions for Room {room} ===")
    
    # 1. Fetch all IN_PROGRESS for this room
    res = supabase.table("admissions").select("*").eq("room_number", room).eq("status", "IN_PROGRESS").order("check_in_at", desc=True).execute()
    
    all_adms = res.data
    if not all_adms or len(all_adms) <= 1:
        print("No duplicates found or only 1 active admission exists.")
        return

    # Keep the first one (newest), discharge rest
    newest = all_adms[0]
    stales = all_adms[1:]
    
    print(f"Keeping Newest: ID={newest['id']} (Token: {newest['access_token']})")
    
    for stale in stales:
        print(f"Discharging Stale: ID={stale['id']} (Token: {stale['access_token']})")
        supabase.table("admissions").update({
            "status": "DISCHARGED",
            "discharged_at": datetime.now().isoformat()
        }).eq("id", stale['id']).execute()
        
    print("Done. All stale admissions discharged.")

if __name__ == "__main__":
    discharge_stale_admissions()
