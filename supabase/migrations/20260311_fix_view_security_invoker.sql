-- view_station_dashboard: SECURITY DEFINER → SECURITY INVOKER 전환
-- Supabase Advisor 지적 사항 수정: RLS가 뷰 소유자가 아닌 쿼리 실행자 기준으로 적용되어야 함

DROP VIEW IF EXISTS view_station_dashboard CASCADE;

CREATE VIEW view_station_dashboard WITH (security_invoker = true) AS
WITH latest_vitals AS (
    SELECT DISTINCT ON (admission_id) *
    FROM vital_signs
    ORDER BY admission_id, recorded_at DESC
),
latest_iv AS (
    SELECT DISTINCT ON (admission_id) *
    FROM iv_records
    ORDER BY admission_id, created_at DESC
),
latest_meal AS (
    SELECT DISTINCT ON (admission_id) *
    FROM meal_requests
    ORDER BY admission_id, created_at DESC
)
SELECT
    a.id AS id,
    a.room_number,
    a.patient_name_masked AS display_name,
    a.access_token,
    a.dob,
    a.gender,
    a.check_in_at,
    a.attending_physician,
    v.temperature AS latest_temp,
    v.recorded_at AS last_vital_at,
    CASE
        WHEN v.temperature >= 38.0
             AND v.recorded_at >= (NOW() - INTERVAL '6 hours') THEN true
        ELSE false
    END AS had_fever_in_6h,
    i.infusion_rate AS iv_rate,
    i.photo_url AS iv_photo,
    m.request_type AS meal_type,
    m.pediatric_meal_type,
    m.guardian_meal_type,
    m.created_at AS meal_requested_at
FROM admissions a
LEFT JOIN latest_vitals v ON a.id = v.admission_id
LEFT JOIN latest_iv i ON a.id = i.admission_id
LEFT JOIN latest_meal m ON a.id = m.admission_id
WHERE a.status IN ('IN_PROGRESS', 'OBSERVATION')
ORDER BY a.check_in_at DESC;

-- RLS 정책이 적용된 역할에게 SELECT 권한 부여
GRANT SELECT ON view_station_dashboard TO authenticated;
GRANT SELECT ON view_station_dashboard TO anon;
