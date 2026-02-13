-- 기존 정책이 있다면 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Enable all access for exam_schedules" ON public.exam_schedules;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.exam_schedules;

-- RLS 활성화 확인
ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;

-- 모든 권한 허용 정책 생성
CREATE POLICY "Enable all access for exam_schedules" 
ON public.exam_schedules 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- (선택) 아예 RLS를 끄는 방법 (보안상 권장되지 않으나 디버깅용)
-- ALTER TABLE public.exam_schedules DISABLE ROW LEVEL SECURITY;
