from database import supabase
from datetime import datetime

def cleanup_duplicates():
    print("=== Cleaning up duplicate admissions ===")
    if not supabase:
        print("Error: Supabase client not initialized")
        return

    # 1. Get List of Active Admissions
    res = supabase.table("admissions").select("*").eq("status", "IN_PROGRESS").execute()
    admissions = res.data
    
    if not admissions:
        print("No active IN_PROGRESS admissions found.")
        return

    # Group by room_number
    by_room = {}
    for adm in admissions:
        room = adm['room_number']
        if room not in by_room:
            by_room[room] = []
        by_room[room].append(adm)

    total_cleaned = 0
    
    # Process each room
    for room, adms in by_room.items():
        if len(adms) <= 1:
            continue
            
        print(f"Room {room}: Found {len(adms)} active admissions.")
        # Sort by created_at (or check_in_at) descending - keep the newest one
        # Assuming higher ID/check_in_at is newer. Using check_in_at.
        adms.sort(key=lambda x: x['check_in_at'] or '', reverse=True)
        
        keep = adms[0]
        duplicates = adms[1:]
        
        print(f"  Keeping: {keep['patient_name_masked']} ({keep['id']}) - {keep['check_in_at']}")
        
        for dup in duplicates:
            print(f"  Discharging: {dup['patient_name_masked']} ({dup['id']}) - {dup['check_in_at']}")
            try:
                supabase.table("admissions").update({
                    "status": "DISCHARGED",
                    "discharged_at": datetime.now().isoformat()
                }).eq("id", dup['id']).execute()
                total_cleaned += 1
            except Exception as e:
                print(f"  Failed to discharge {dup['id']}: {e}")

    print(f"=== Cleanup Complete. Discharged {total_cleaned} duplicates. ===")

if __name__ == "__main__":
    cleanup_duplicates()
