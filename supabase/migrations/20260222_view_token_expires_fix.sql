-- 42703 해결: token_expires_at 추가 후 뷰 재생성
-- 순서: 1) 뷰 삭제 2) iv_records 타입 변경 3) admissions 컬럼 추가 4) 뷰 재생성

-- 1. 기존 뷰 삭제 (의존성 해제)
DROP VIEW IF EXISTS view_station_dashboard;

-- 2. iv_records.infusion_rate: INTEGER -> NUMERIC (22P02 방지)
ALTER TABLE iv_records
ALTER COLUMN infusion_rate TYPE NUMERIC USING infusion_rate::NUMERIC;

-- 3. admissions에 token_expires_at 추가 (뷰 참조 전 필수)
ALTER TABLE admissions
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- 4. 뷰 재생성 (token_expires_at 포함)
CREATE OR REPLACE VIEW view_station_dashboard AS
WITH latest_vitals AS (
    SELECT DISTINCT ON (admission_id) *
    FROM vital_signs
    WHERE recorded_at > (NOW() - INTERVAL '5 days')
    ORDER BY admission_id, recorded_at DESC
),
latest_iv AS (
    SELECT DISTINCT ON (admission_id) *
    FROM iv_records
    WHERE created_at > (NOW() - INTERVAL '7 days')
    ORDER BY admission_id, created_at DESC
),
latest_meal AS (
    SELECT DISTINCT ON (admission_id) *
    FROM meal_requests
    WHERE created_at > (NOW() - INTERVAL '3 days')
    ORDER BY admission_id, created_at DESC
)
SELECT
    a.id as id,
    a.room_number,
    a.patient_name_masked as display_name,
    a.access_token,
    a.token_expires_at,
    a.dob,
    a.gender,
    a.check_in_at,
    v.temperature as latest_temp,
    v.recorded_at as last_vital_at,
    CASE
        WHEN v.temperature >= 38.0
             AND v.recorded_at >= (NOW() - INTERVAL '6 hours') THEN true
        ELSE false
    END as had_fever_in_6h,
    i.infusion_rate as iv_rate,
    i.photo_url as iv_photo,
    m.request_type as meal_type,
    m.pediatric_meal_type,
    m.guardian_meal_type,
    m.created_at as meal_requested_at
FROM admissions a
LEFT JOIN latest_vitals v ON a.id = v.admission_id
LEFT JOIN latest_iv i ON a.id = i.admission_id
LEFT JOIN latest_meal m ON a.id = m.admission_id
WHERE a.status IN ('IN_PROGRESS', 'OBSERVATION')
ORDER BY a.check_in_at DESC;

GRANT SELECT ON public.view_station_dashboard TO anon;
GRANT SELECT ON public.view_station_dashboard TO authenticated;
