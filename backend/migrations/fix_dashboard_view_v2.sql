-- [Fix] 병동 스테이션 대시보드 그리드 데이터 누락 해결
-- 원인: 5일(체온), 7일(수액), 3일(식사) 시간 제한 필터로 인해 장기 입원 환자 데이터가 '-'로 표시됨
-- 해결: 시간 제한을 제거하여 활성 입원(IN_PROGRESS, OBSERVATION)에 대한 최신 데이터를 항상 표시하도록 수정
-- 주의: 컬럼 순서나 구성이 바뀌는 경우 CREATE OR REPLACE 가 실패하므로 DROP 후 다시 생성합니다.

DROP VIEW IF EXISTS view_station_dashboard CASCADE;

CREATE VIEW view_station_dashboard AS
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
    a.id as id,
    a.room_number,
    a.patient_name_masked as display_name,
    a.access_token,
    a.dob,
    a.gender,
    a.check_in_at,
    a.attending_physician,
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

-- 스키마 캐시 갱신 알림
NOTIFY pgrst, 'reload schema';
