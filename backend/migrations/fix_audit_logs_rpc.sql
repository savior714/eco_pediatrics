-- 1. RLS를 우회하여 감사 로그를 기록하는 SECURITY DEFINER 함수 생성
CREATE OR REPLACE FUNCTION log_audit_activity(
    p_actor_type TEXT,
    p_action TEXT,
    p_target_id TEXT,
    p_ip_address TEXT DEFAULT '0.0.0.0'
) RETURNS VOID AS $$
BEGIN
    -- SECURITY DEFINER를 통해 RLS를 무시하고 시스템 권한으로 삽입
    INSERT INTO public.audit_logs (actor_type, action, target_id, ip_address)
    VALUES (p_actor_type, p_action, p_target_id, p_ip_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. anon(익명 사용자)도 RPC 호출은 가능하도록 권한 부여
GRANT EXECUTE ON FUNCTION log_audit_activity(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
