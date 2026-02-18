-- Supabase RLS 삭제 권한 추가 (Idempotency 해결)

-- 1. 검사 일정 삭제 권한 추가
CREATE POLICY "Allow delete for active admissions" ON public.exam_schedules
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admissions 
    WHERE admissions.id = admission_id 
    AND admissions.status = 'IN_PROGRESS'
  )
);

-- 2. 바이탈 기록 삭제 권한 추가
CREATE POLICY "Allow delete for active admissions" ON public.vital_signs
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admissions 
    WHERE admissions.id = admission_id 
    AND admissions.status = 'IN_PROGRESS'
  )
);

-- 3. 수액 기록 삭제 권한 추가
CREATE POLICY "Allow delete for active admissions" ON public.iv_records
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admissions 
    WHERE admissions.id = admission_id 
    AND admissions.status = 'IN_PROGRESS'
  )
);

-- 4. 식단 요청 삭제 권한 추가
CREATE POLICY "Allow delete for active admissions" ON public.meal_requests
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admissions 
    WHERE admissions.id = admission_id 
    AND admissions.status = 'IN_PROGRESS'
  )
);

-- 5. 입원 정보 수정 권한 추가 (시딩 및 전실 대응)
CREATE POLICY "Allow update for active admissions" ON public.admissions
FOR UPDATE USING (
  status IN ('IN_PROGRESS', 'OBSERVATION')
) WITH CHECK (
  status IN ('IN_PROGRESS', 'OBSERVATION')
);
