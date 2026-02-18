-- meal_requests RLS 우회를 위한 관리자 권한 upsert 함수
CREATE OR REPLACE FUNCTION upsert_meal_requests_admin(
    p_meals JSONB
) RETURNS VOID AS $$
BEGIN
    -- SECURITY DEFINER를 통해 RLS를 무시하고 시스템 권한으로 삽입 및 수정
    INSERT INTO public.meal_requests (
        admission_id, 
        meal_date, 
        meal_time, 
        pediatric_meal_type, 
        requested_pediatric_meal_type, 
        guardian_meal_type, 
        requested_guardian_meal_type, 
        status, 
        request_type
    )
    SELECT 
        (m->>'admission_id')::UUID, 
        (m->>'meal_date')::DATE, 
        (m->>'meal_time'),
        (m->>'pediatric_meal_type'),
        (m->>'requested_pediatric_meal_type'),
        (m->>'guardian_meal_type'),
        (m->>'requested_guardian_meal_type'),
        (m->>'status'),
        (m->>'request_type')
    FROM jsonb_array_elements(p_meals) AS m
    ON CONFLICT (admission_id, meal_date, meal_time)
    DO UPDATE SET
        pediatric_meal_type = EXCLUDED.pediatric_meal_type,
        requested_pediatric_meal_type = EXCLUDED.requested_pediatric_meal_type,
        guardian_meal_type = EXCLUDED.guardian_meal_type,
        requested_guardian_meal_type = EXCLUDED.requested_guardian_meal_type,
        status = EXCLUDED.status,
        request_type = EXCLUDED.request_type,
        created_at = NOW(); -- 갱신 시간 업데이트
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- API 호출을 위해 권한 부여
GRANT EXECUTE ON FUNCTION upsert_meal_requests_admin(JSONB) TO anon, authenticated;
