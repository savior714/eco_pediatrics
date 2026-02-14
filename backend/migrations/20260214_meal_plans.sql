-- Migration: 20260214_meal_plans
-- Description: Create tables for hospital meal plans and patient overrides

-- 1. Common Meal Plans (The Hospital Menu)
CREATE TABLE IF NOT EXISTS common_meal_plans (
    date DATE PRIMARY KEY,
    breakfast TEXT,
    lunch TEXT,
    dinner TEXT,
    snack TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Patient Meal Overrides (Exceptions like Fasting, Soft Food)
CREATE TABLE IF NOT EXISTS patient_meal_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_time VARCHAR(20) NOT NULL CHECK (meal_time IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('NORMAL', 'SOFT', 'FASTING', 'ALLERGY')),
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: One override per meal per patient
    UNIQUE(admission_id, date, meal_time)
);

-- 3. RLS Policies
ALTER TABLE common_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_meal_overrides ENABLE ROW LEVEL SECURITY;

-- Allow read for everyone (Station & Guardian)
CREATE POLICY "Enable read access for all users" ON common_meal_plans FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON patient_meal_overrides FOR SELECT USING (true);

-- Allow write for Station (Authenticated/Anon for now as per MVP)
-- In PROD, restrict this to Nurse role. For now, matching existing patterns.
CREATE POLICY "Enable insert for all users" ON common_meal_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON common_meal_plans FOR UPDATE USING (true);

CREATE POLICY "Enable insert for all users" ON patient_meal_overrides FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON patient_meal_overrides FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON patient_meal_overrides FOR DELETE USING (true);

-- 4. Audit Log Helper (Optional, if you want to track menu changes)
-- (Skipping specific trigger for now to keep simple)
