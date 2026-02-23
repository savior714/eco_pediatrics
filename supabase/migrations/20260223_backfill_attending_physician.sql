-- Backfill: 현재 입원 중(IN_PROGRESS, OBSERVATION)이면서 담당의가 NULL인 레코드에 기본 원장님 할당.
-- 실행 전 병원 정책에 맞게 '조요셉'을 다른 원장님 이름으로 변경하여 사용하세요.
-- Supabase SQL Editor에서 직접 실행하거나, supabase db push 후 수동 실행.

UPDATE admissions
SET attending_physician = '조요셉'
WHERE status IN ('IN_PROGRESS', 'OBSERVATION')
  AND attending_physician IS NULL;
