-- document_requests RLS 에러(42501) 핫픽스
-- 관찰(OBSERVATION) 상태 환자나 기타 익명 사용자의 신청이 가능하도록 권한 확장

-- 1. 기존 제한적 인서트 정책 삭제
DROP POLICY IF EXISTS "Allow insert for active admissions" ON public.document_requests;

-- 2. "Enable insert for all users" 패턴 적용 (audit_logs와 통일)
CREATE POLICY "Enable insert for all users" 
ON public.document_requests 
FOR INSERT 
WITH CHECK (true);

-- 3. 조회 권한을 STATUS IN ('IN_PROGRESS', 'OBSERVATION')으로 확장
DROP POLICY IF EXISTS "Enable read for active sessions" ON public.document_requests;
CREATE POLICY "Enable read for active sessions" 
ON public.document_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM admissions 
    WHERE admissions.id = admission_id 
    AND admissions.status IN ('IN_PROGRESS', 'OBSERVATION')
  )
);

-- 정책 반영 확인용 (PostgREST 캐시 갱신)
NOTIFY pgrst, 'reload schema';
