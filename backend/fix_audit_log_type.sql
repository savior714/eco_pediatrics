-- audit_logs 테이블의 target_id 컬럼 타입을 UUID에서 TEXT로 변경
-- 기존 UUID 데이터는 자동으로 텍스트로 변환됩니다.
ALTER TABLE public.audit_logs ALTER COLUMN target_id TYPE TEXT;
