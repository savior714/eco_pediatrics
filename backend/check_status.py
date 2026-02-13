from database import supabase

def check_status():
    token = "83ddc0e6-38ce-44bb-9039-96cb303ff83b"
    print(f"=== Checking Status for Token: {token} ===")
    
    res = supabase.table("admissions").select("*").eq("access_token", token).execute()
    if res.data:
        adm = res.data[0]
        print(f"ID: {adm['id']}")
        print(f"Room: {adm['room_number']}")
        print(f"Status: {adm['status']}") # Should be DISCHARGED
    else:
        print("Token not found.")

if __name__ == "__main__":
    check_status()
