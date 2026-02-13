from database import supabase
import sys

def check_data():
    print("=== Checking Admissions & Exam Schedules ===")
    if not supabase:
        print("Error: Supabase client not initialized")
        return

    # 1. Get List of Active Admissions
    res = supabase.table("admissions").select("*").eq("status", "IN_PROGRESS").execute()
    admissions = res.data
    
    if not admissions:
        print("No active IN_PROGRESS admissions found.")
        return

    print(f"Found {len(admissions)} active admissions.")
    
    for adm in admissions:
        a_id = adm['id']
        name = adm['patient_name_masked']
        room = adm['room_number']
        token = adm['access_token']
        
        # 2. Count Exams for this admission
        exam_res = supabase.table("exam_schedules").select("id", count="exact").eq("admission_id", a_id).execute()
        exam_count = len(exam_res.data)
        
        print(f"[{room}] {name} (ID: {a_id})")
        print(f"    - Token: {token}")
        print(f"    - Exam Schedules: {exam_count} items")
        if exam_count > 0:
            print(f"      sample: {exam_res.data[0]}")

if __name__ == "__main__":
    check_data()
