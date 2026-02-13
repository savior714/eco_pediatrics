import os
import jwt
from dotenv import load_dotenv
from database import supabase

load_dotenv()

def check_key():
    print("=== Checking Supabase Key Role ===")
    key = os.environ.get("SUPABASE_KEY")
    if not key:
        print("No SUPABASE_KEY found in env.")
        return

    try:
        # JWT is 3 parts. We act like we decoding it (without verify signature to just read payload)
        decoded = jwt.decode(key, options={"verify_signature": False})
        role = decoded.get("role")
        print(f"Key Role: {role}")
    except Exception as e:
        print(f"Failed to decode key: {e}")

    print("\n=== Checking Exam Schedules Visibility ===")
    if not supabase:
        print("Supabase client is None")
        return
        
    res = supabase.table("exam_schedules").select("*").execute()
    data = res.data
    print(f"Visible Exam Schedules: {len(data)}")
    for item in data:
        print(f" - {item}")

if __name__ == "__main__":
    check_key()
