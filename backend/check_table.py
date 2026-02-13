from database import supabase

if not supabase:
    print("DB Connection Failed")
    exit(1)

try:
    res = supabase.table("exam_schedules").select("id").limit(1).execute()
    print("Table exists")
except Exception as e:
    print(f"Error: {e}")
