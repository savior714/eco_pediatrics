-- ==========================================
-- NUCLEAR SCHEMA FIX & OPTIMIZATION (v2)
-- Fixes: PGRST205, 500 Internal Error, Duplicate Rooms
-- ==========================================

-- 0. Clean up duplicate active room entries (Keep only the latest one)
-- This fixes the "could not create unique index" error 23505
DELETE FROM admissions a1
USING admissions a2
WHERE a1.room_number = a2.room_number 
  AND a1.status IN ('IN_PROGRESS', 'OBSERVATION')
  AND a2.status IN ('IN_PROGRESS', 'OBSERVATION')
  AND a1.id < a2.id;

-- 1. Create Unique Index (Required for proper room management)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_room
ON admissions (room_number)
WHERE status IN ('IN_PROGRESS', 'OBSERVATION');

-- 2. Ensure missing columns exist in core tables
-- Admissions table
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('M', 'F'));

-- Meal Requests table (Critical fix for the 500 error)
ALTER TABLE meal_requests ADD COLUMN IF NOT EXISTS meal_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE meal_requests ADD COLUMN IF NOT EXISTS meal_time VARCHAR(20) DEFAULT 'LUNCH' CHECK (meal_time IN ('BREAKFAST', 'LUNCH', 'DINNER'));

-- 3. Create view_station_dashboard (Fetching Optimization)
CREATE OR REPLACE VIEW view_station_dashboard AS
WITH latest_vitals AS (
    SELECT DISTINCT ON (admission_id) *
    FROM vital_signs
    WHERE recorded_at > (NOW() - INTERVAL '5 days')
    ORDER BY admission_id, recorded_at DESC
),
latest_iv AS (
    SELECT DISTINCT ON (admission_id) *
    FROM iv_records
    WHERE created_at > (NOW() - INTERVAL '7 days')
    ORDER BY admission_id, created_at DESC
),
latest_meal AS (
    SELECT DISTINCT ON (admission_id) *
    FROM meal_requests
    WHERE created_at > (NOW() - INTERVAL '3 days')
    ORDER BY admission_id, created_at DESC
)
SELECT
    a.id as id,
    a.room_number,
    a.patient_name_masked as display_name,
    a.access_token,
    a.dob,
    a.gender,
    a.check_in_at,
    v.temperature as latest_temp,
    v.recorded_at as last_vital_at,
    CASE
        WHEN v.temperature >= 38.0
             AND v.recorded_at >= (NOW() - INTERVAL '6 hours') THEN true
        ELSE false
    END as had_fever_in_6h,
    i.infusion_rate as iv_rate,
    i.photo_url as iv_photo,
    m.request_type as meal_type,
    m.pediatric_meal_type,
    m.guardian_meal_type,
    m.created_at as meal_requested_at
FROM admissions a
LEFT JOIN latest_vitals v ON a.id = v.admission_id
LEFT JOIN latest_iv i ON a.id = i.admission_id
LEFT JOIN latest_meal m ON a.id = m.admission_id
WHERE a.status IN ('IN_PROGRESS', 'OBSERVATION')
ORDER BY a.check_in_at DESC;

-- 4. Grant Permissions for the View (Required for PostgREST/API)
GRANT SELECT ON public.view_station_dashboard TO anon;
GRANT SELECT ON public.view_station_dashboard TO authenticated;

-- 5. Essential RPCs (SECURITY DEFINER for RLS bypass)
-- create_admission_transaction
CREATE OR REPLACE FUNCTION create_admission_transaction(
    p_patient_name_masked TEXT,
    p_room_number TEXT,
    p_dob DATE,
    p_gender TEXT,
    p_check_in_at TIMESTAMPTZ,
    p_actor_type TEXT,
    p_ip_address TEXT
) RETURNS JSON AS $$
DECLARE
    v_admission_id UUID;
    v_token UUID;
BEGIN
    INSERT INTO admissions (
        patient_name_masked, 
        room_number, 
        status, 
        dob, 
        gender, 
        check_in_at
    ) VALUES (
        p_patient_name_masked,
        p_room_number,
        'IN_PROGRESS',
        p_dob,
        p_gender,
        COALESCE(p_check_in_at, NOW())
    ) RETURNING id, access_token INTO v_admission_id, v_token;

    INSERT INTO audit_logs (actor_type, action, target_id, ip_address)
    VALUES (p_actor_type, 'CREATE', v_admission_id, p_ip_address);

    -- Return all fields needed for the Admission model
    RETURN json_build_object(
        'id', v_admission_id, 
        'access_token', v_token,
        'patient_name_masked', p_patient_name_masked,
        'room_number', p_room_number,
        'dob', p_dob,
        'gender', p_gender,
        'status', 'IN_PROGRESS',
        'check_in_at', COALESCE(p_check_in_at, NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- discharge_patient_transaction
CREATE OR REPLACE FUNCTION discharge_patient_transaction(
    p_admission_id UUID,
    p_actor_type TEXT,
    p_ip_address TEXT
) RETURNS JSON AS $$
DECLARE
    v_room TEXT;
    v_token UUID;
BEGIN
    UPDATE admissions
    SET status = 'DISCHARGED', discharged_at = NOW()
    WHERE id = p_admission_id AND status IN ('IN_PROGRESS', 'OBSERVATION')
    RETURNING room_number, access_token INTO v_room, v_token;

    IF NOT FOUND THEN RAISE EXCEPTION 'Active admission not found'; END IF;

    INSERT INTO audit_logs (actor_type, action, target_id, ip_address)
    VALUES (p_actor_type, 'DISCHARGE', p_admission_id, p_ip_address);

    RETURN json_build_object('admission_id', p_admission_id, 'room', v_room, 'token', v_token);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
