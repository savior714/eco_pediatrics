-- PID Database Full Cleanup (Nuclear Reset)
-- Note: This is a destructive action and cannot be undone via SQL.
TRUNCATE TABLE public.audit_logs;
TRUNCATE TABLE public.vital_signs;
TRUNCATE TABLE public.iv_records;
TRUNCATE TABLE public.meal_requests;
TRUNCATE TABLE public.exam_schedules;
TRUNCATE TABLE public.document_requests;
TRUNCATE TABLE public.patient_meal_overrides;
TRUNCATE TABLE public.common_meal_plans;
DELETE FROM public.admissions;
