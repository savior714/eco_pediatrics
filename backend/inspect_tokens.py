from database import supabase

def inspect_tokens():
    token1 = "1db291b9-8d17-4a61-a5eb-b8e46c0a3c2d" # Dashboard is using this
    token2 = "2c8d95d5-98f6-48bf-a72c-5ec0f007bb7b" # Backend is broadcasting to this

    print(f"=== Inspecting Token 1: {token1} ===")
    res1 = supabase.table("admissions").select("*").eq("access_token", token1).execute()
    data1 = res1.data
    if data1:
        print(f"Found Admission 1: ID={data1[0]['id']}, Name={data1[0]['patient_name_masked']}, Room={data1[0]['room_number']}, Status={data1[0]['status']}")
    else:
        print("Token 1 not found or invalid.")

    print(f"\n=== Inspecting Token 2: {token2} ===")
    res2 = supabase.table("admissions").select("*").eq("access_token", token2).execute()
    data2 = res2.data
    if data2:
        print(f"Found Admission 2: ID={data2[0]['id']}, Name={data2[0]['patient_name_masked']}, Room={data2[0]['room_number']}, Status={data2[0]['status']}")
    else:
        print("Token 2 not found or invalid.")

    if data1 and data2:
        if data1[0]['room_number'] == data2[0]['room_number']:
            print("\n[CRITICAL] Duplicate Active Admissions found for the same room!")
            # Compare check_in_at instead
            t1 = data1[0].get('check_in_at')
            t2 = data2[0].get('check_in_at')
            print(f"Admission 1 check_in: {t1}")
            print(f"Admission 2 check_in: {t2}")

            if t1 and t2 and t1 > t2:
                 print(f"Admission 1 is newer.")
            else:
                 print(f"Admission 2 is newer.")

if __name__ == "__main__":
    inspect_tokens()
