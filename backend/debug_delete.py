from database import supabase
import datetime

def test_delete():
    print("=== Testing DELETE on exam_schedules ===")
    if not supabase:
        print("Error: Supabase client not initialized")
        return

    # 1. Insert a dummy record (needs a valid admission_id)
    # Get any valid admission
    adm = supabase.table("admissions").select("id").limit(1).execute()
    if not adm.data:
        print("No admissions found to test with.")
        return
    
    adm_id = adm.data[0]['id']
    print(f"Using admission: {adm_id}")

    # Insert
    new_exam = {
        "admission_id": adm_id,
        "scheduled_at": datetime.datetime.now().isoformat(),
        "name": "TEST_DELETE_ITEM",
        "note": "To be deleted"
    }
    
    try:
        res = supabase.table("exam_schedules").insert(new_exam).execute()
        created_id = res.data[0]['id']
        print(f"Created dummy exam schedule: {created_id}")
    except Exception as e:
        print(f"Failed to create dummy: {e}")
        return

    # 2. Try to DELETE
    try:
        print(f"Attempting to delete {created_id}...")
        res = supabase.table("exam_schedules").delete().eq("id", created_id).execute()
        print(f"Delete result: {res.data}")
        if not res.data:
            print("Delete returned empty data! (Likely RLS blocked)")
        else:
            print("Delete successful!")
    except Exception as e:
        print(f"DELETE FAILED with exception: {e}")

if __name__ == "__main__":
    test_delete()
