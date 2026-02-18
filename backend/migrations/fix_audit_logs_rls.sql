-- 1. 기존 정책 제거
DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."audit_logs";
DROP POLICY IF EXISTS "Enable insert for all" ON "public"."audit_logs";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."audit_logs";

-- 2. 데이터 무결성을 위한 제약 조건 강화
ALTER TABLE "public"."audit_logs" 
DROP CONSTRAINT IF EXISTS "check_valid_actor_type";

ALTER TABLE "public"."audit_logs" 
ADD CONSTRAINT "check_valid_actor_type" 
CHECK (actor_type = ANY (ARRAY['NURSE', 'GUARDIAN', 'MOBILE_USER', 'SYSTEM', 'ADMIN', 'DOCTOR', 'PHARMACIST']));

-- 3. 통합 RLS 정책 생성 (MOBILE_USER 포함)
CREATE POLICY "Allow log insertion for valid actor types" 
ON "public"."audit_logs"
FOR INSERT 
TO authenticated, anon
WITH CHECK (
  actor_type = ANY (ARRAY['NURSE', 'GUARDIAN', 'MOBILE_USER', 'SYSTEM', 'ADMIN', 'DOCTOR', 'PHARMACIST'])
);

-- 4. 조회 권한 확인 및 재설정
DROP POLICY IF EXISTS "Staff can view all audit logs" ON "public"."audit_logs";
CREATE POLICY "Staff can view all audit logs"
ON "public"."audit_logs"
FOR SELECT 
TO authenticated
USING (auth.role() = 'authenticated');
