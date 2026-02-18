-- Supabase RLS 삭제 권한 추가 (Idempotency 해결)

-- 1. 검사 일정 삭제 권한 추가
DROP POLICY IF EXISTS "Allow delete for active admissions" ON public.exam_schedules;
CREATE POLICY "Allow delete for active admissions" ON public.exam_schedules
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admissions 
    WHERE admissions.id = admission_id 
    AND admissions.status IN ('IN_PROGRESS', 'OBSERVATION')
  )
);

-- 2. 바이탈 기록 삭제 권한 추가
DROP POLICY IF EXISTS "Allow delete for active admissions" ON public.vital_signs;
CREATE POLICY "Allow delete for active admissions" ON public.vital_signs
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admissions 
    WHERE admissions.id = admission_id 
    AND admissions.status IN ('IN_PROGRESS', 'OBSERVATION')
  )
);

-- 3. 수액 기록 삭제 권한 추가
DROP POLICY IF EXISTS "Allow delete for active admissions" ON public.iv_records;
CREATE POLICY "Allow delete for active admissions" ON public.iv_records
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admissions 
    WHERE admissions.id = admission_id 
    AND admissions.status IN ('IN_PROGRESS', 'OBSERVATION')
  )
);

-- 4. 식단 요청 권한 추가 (CRUD 전체)
DROP POLICY IF EXISTS "Allow delete for active admissions" ON public.meal_requests;
DROP POLICY IF EXISTS "Allow select for all" ON public.meal_requests;
DROP POLICY IF EXISTS "Allow insert for active admissions" ON public.meal_requests;
DROP POLICY IF EXISTS "Allow update for active admissions" ON public.meal_requests;

CREATE POLICY "Allow select for all" ON public.meal_requests FOR SELECT USING (true);

CREATE POLICY "Allow insert for active admissions" ON public.meal_requests 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM admissions 
    WHERE admissions.id = admission_id 
    AND admissions.status IN ('IN_PROGRESS', 'OBSERVATION')
  )
);

CREATE POLICY "Allow update for active admissions" ON public.meal_requests
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM admissions 
    WHERE admissions.id = admission_id 
    AND admissions.status IN ('IN_PROGRESS', 'OBSERVATION')
  )
);

CREATE POLICY "Allow delete for active admissions" ON public.meal_requests
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admissions 
    WHERE admissions.id = admission_id 
    AND admissions.status IN ('IN_PROGRESS', 'OBSERVATION')
  )
);
