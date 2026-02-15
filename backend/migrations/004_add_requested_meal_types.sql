-- Migration 004: Add requested meal type columns for confirmation flow

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meal_requests' AND column_name='requested_pediatric_meal_type') THEN
        ALTER TABLE meal_requests ADD COLUMN requested_pediatric_meal_type VARCHAR(50);
        COMMENT ON COLUMN meal_requests.requested_pediatric_meal_type IS '환자 측에서 신청한 환아 식사 종류';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meal_requests' AND column_name='requested_guardian_meal_type') THEN
        ALTER TABLE meal_requests ADD COLUMN requested_guardian_meal_type VARCHAR(50);
        COMMENT ON COLUMN meal_requests.requested_guardian_meal_type IS '환자 측에서 신청한 보호자 식사 종류';
    END IF;
END $$;

-- Update status to be more explicit if needed, but 'PENDING' and 'APPROVED' already exist in logic.
-- Ensure status column exists and has default.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meal_requests' AND column_name='status') THEN
        ALTER TABLE meal_requests ADD COLUMN status VARCHAR(20) DEFAULT 'PENDING';
    END IF;
END $$;
