-- Migration 003: Add meal_date and meal_time for spreadsheet view

ALTER TABLE meal_requests
ADD COLUMN meal_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN meal_time VARCHAR(20) DEFAULT 'LUNCH'; -- 'BREAKFAST', 'LUNCH', 'DINNER'

-- Update comments
COMMENT ON COLUMN meal_requests.meal_date IS '식사 날짜';
COMMENT ON COLUMN meal_requests.meal_time IS '식사 시간 (BREAKFAST, LUNCH, DINNER)';

-- Create Unique Index for Upsert support (One request per patient per time slot)
-- We use a unique index so we can use ON CONFLICT in Supabase/Postgres
CREATE UNIQUE INDEX idx_meal_requests_unique ON meal_requests (admission_id, meal_date, meal_time);

-- We might want to backfill existing data if any, but since defaults are set, it's fine.
-- Existing rows will default to CURRENT_DATE and 'LUNCH'.
