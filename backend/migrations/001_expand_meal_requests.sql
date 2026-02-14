-- Add new columns for expanded meal domain
ALTER TABLE meal_requests 
ADD COLUMN IF NOT EXISTS pediatric_meal_type TEXT,
ADD COLUMN IF NOT EXISTS guardian_meal_type TEXT,
ADD COLUMN IF NOT EXISTS room_note TEXT;

-- Comment on columns
COMMENT ON COLUMN meal_requests.pediatric_meal_type IS '환아식 종류 (일반식, 연식, 미음, 금식 등)';
COMMENT ON COLUMN meal_requests.guardian_meal_type IS '보호자식 종류 (일반식, 선택 안함)';
COMMENT ON COLUMN meal_requests.room_note IS '병실 비고 사항';
