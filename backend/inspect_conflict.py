from database import supabase

def inspect_and_fix():
    token_dash = "83ddc0e6-38ce-44bb-9039-96cb303ff83b"
    token_backend = "2c8d95d5-98f6-48bf-a72c-5ec0f007bb7b"

    print(f"=== Inspecting Dashboard Token: {token_dash} ===")
    res1 = supabase.table("admissions").select("*").eq("access_token", token_dash).execute()
    adm_dash = res1.data[0] if res1.data else None
    if adm_dash:
        print(f"Specified by Dashboard: ID={adm_dash['id']}, Room={adm_dash['room_number']}, Created={adm_dash.get('created_at') or adm_dash.get('check_in_at')}, Status={adm_dash['status']}")
    else:
        print("Dashboard Token not found.")

    print(f"\n=== Inspecting Backend Token: {token_backend} ===")
    res2 = supabase.table("admissions").select("*").eq("access_token", token_backend).execute()
    adm_backend = res2.data[0] if res2.data else None
    if adm_backend:
        print(f"Specified by Backend: ID={adm_backend['id']}, Room={adm_backend['room_number']}, Created={adm_backend.get('created_at') or adm_backend.get('check_in_at')}, Status={adm_backend['status']}")
    else:
        print("Backend Token not found.")

    # List all active for this room
    if adm_dash:
        room = adm_dash['room_number']
        print(f"\n=== ALL Active Admissions for Room {room} ===")
        all_active = supabase.table("admissions").select("*").eq("room_number", room).eq("status", "IN_PROGRESS").order("check_in_at", desc=True).execute()
        for idx, adm in enumerate(all_active.data):
            print(f"[{idx}] ID={adm['id']}, Token={adm['access_token']}, Created={adm.get('check_in_at')}")

if __name__ == "__main__":
    inspect_and_fix()
