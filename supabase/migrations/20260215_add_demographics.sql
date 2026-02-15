-- Migration: Add Patient Demographics (dob, gender) to admissions table
-- Date: 2026-02-15

-- 1. Add dob column
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS dob DATE;

-- 2. Add gender column with M/F constraint
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS gender TEXT;

-- 3. Add CHECK constraint (wrapped in exception handler-like logic for safety)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_gender_valid'
    ) THEN
        ALTER TABLE admissions ADD CONSTRAINT check_gender_valid CHECK (gender IN ('M', 'F'));
    END IF;
END $$;

-- 4. Reload schema cache (Supabase/PostgREST specific)
NOTIFY pgrst, 'reload schema';
