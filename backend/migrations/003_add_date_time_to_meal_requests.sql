-- Migration 003: Add meal_date and meal_time for spreadsheet view

-- 1. Add Columns safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meal_requests' AND column_name='meal_date') THEN
        ALTER TABLE meal_requests ADD COLUMN meal_date DATE DEFAULT CURRENT_DATE;
        COMMENT ON COLUMN meal_requests.meal_date IS '식사 날짜';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meal_requests' AND column_name='meal_time') THEN
        ALTER TABLE meal_requests ADD COLUMN meal_time VARCHAR(20) DEFAULT 'LUNCH';
        COMMENT ON COLUMN meal_requests.meal_time IS '식사 시간 (BREAKFAST, LUNCH, DINNER)';
    END IF;
END $$;

-- 2. Add Valid Check Constraint (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_meal_time_valid') THEN
        ALTER TABLE meal_requests 
        ADD CONSTRAINT check_meal_time_valid 
        CHECK (meal_time IN ('BREAKFAST', 'LUNCH', 'DINNER'));
    END IF;
END $$;

-- 3. Create Unique Index (Idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_requests_unique 
ON meal_requests (admission_id, meal_date, meal_time);

-- We might want to backfill existing data if any, but since defaults are set, it's fine.
-- Existing rows will default to CURRENT_DATE and 'LUNCH'.
