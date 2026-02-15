-- Add indexes to improve dashboard query performance
-- Target: admission_id foreign keys

CREATE INDEX IF NOT EXISTS idx_vitals_admission_id ON vital_signs(admission_id);
CREATE INDEX IF NOT EXISTS idx_iv_records_admission_id ON iv_records(admission_id);
CREATE INDEX IF NOT EXISTS idx_meal_requests_admission_id ON meal_requests(admission_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_admission_id ON exam_schedules(admission_id);
CREATE INDEX IF NOT EXISTS idx_doc_requests_admission_id ON document_requests(admission_id);

-- Composite index for the temperature chart (Ordering by recorded_at)
CREATE INDEX IF NOT EXISTS idx_vitals_admission_recorded ON vital_signs(admission_id, recorded_at DESC);
