from database import supabase

def apply_policies():
    print("=== Applying Permissive RLS Policies ===")
    if not supabase:
        print("Error: Supabase client not initialized")
        return

    # SQL to enable insert/select/update/delete for everyone on exam_schedules
    # Note: supabase-py client doesn't support raw SQL easily unless we use rpc or have direct connection.
    # But we can try to use the 'rpc' interface if we had a function, or we can just hope the user runs schema.sql
    # Since we can't easily run DDL via the client without a helper function, we'll try to use a workaround or instructions.
    
    # Actually, we can check if we can insert/delete via 'anon' logic if we could simulate it, but we have service key.
    
    # We will print the SQL to be run in the supabase dashboard query editor if this script fails to fix it via magic.
    
    sql = """
    -- Run this in Supabase SQL Editor
    CREATE POLICY "Enable all access for exam_schedules" ON public.exam_schedules FOR ALL USING (true) WITH CHECK (true);
    """
    print("Please ensure the following policy exists if you are using Anon key:")
    print(sql)

    # Let's try to inspect if we can do anything. 
    # Since we are using Service Role, we *should* be fine.
    # But maybe the issue is that the 'delete' endpoint is trying to find the item first, and GET fails?
    
    print("Checking if we can read exam schedules...")
    try:
        res = supabase.table("exam_schedules").select("*").limit(1).execute()
        print(f"Read success. Include: {len(res.data)} items.")
    except Exception as e:
        print(f"Read failed: {e}")

if __name__ == "__main__":
    apply_policies()
