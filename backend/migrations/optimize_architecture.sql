-- Architectural Optimization Migration (Phase 26-27)

-- 1. Unique Constraint to prevent race conditions (one patient per room)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_room
ON admissions (room_number)
WHERE status IN ('IN_PROGRESS', 'OBSERVATION');

-- 2. transfer_patient_transaction RPC
CREATE OR REPLACE FUNCTION transfer_patient_transaction(
    p_admission_id UUID,
    p_target_room TEXT,
    p_actor_type TEXT,
    p_ip_address TEXT
) RETURNS JSON AS $$
-- // ... existing declarations ....
DECLARE
    v_old_room TEXT;
    v_token UUID;
    v_status TEXT;
BEGIN
-- // ... existing logic ....
    -- Validation: Check Target Room Availability
    IF EXISTS (
        SELECT 1 FROM admissions
        WHERE room_number = p_target_room
          AND status IN ('IN_PROGRESS', 'OBSERVATION')
    ) THEN
        RAISE EXCEPTION 'Room % is occupied', p_target_room;
    END IF;

    -- Lock row and get current state
    SELECT room_number, access_token, status INTO v_old_room, v_token, v_status
    FROM admissions WHERE id = p_admission_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Admission not found'; END IF;
    IF v_status NOT IN ('IN_PROGRESS', 'OBSERVATION') THEN
        RAISE EXCEPTION 'Patient is not active';
    END IF;

    -- Update Admission
    UPDATE admissions
    SET room_number = p_target_room, updated_at = NOW()
    WHERE id = p_admission_id;

    -- Create Audit Log
    INSERT INTO audit_logs (actor_type, action, target_id, ip_address, details)
    VALUES (p_actor_type, 'TRANSFER', p_admission_id, p_ip_address,
            jsonb_build_object('from', v_old_room, 'to', p_target_room));

    RETURN json_build_object(
        'admission_id', p_admission_id,
        'old_room', v_old_room,
        'new_room', p_target_room,
        'token', v_token
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. discharge_patient_transaction RPC
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
    SET status = 'DISCHARGED', discharged_at = NOW(), updated_at = NOW()
    WHERE id = p_admission_id
    RETURNING room_number, access_token INTO v_room, v_token;

    IF NOT FOUND THEN RAISE EXCEPTION 'Admission not found'; END IF;

    INSERT INTO audit_logs (actor_type, action, target_id, ip_address)
    VALUES (p_actor_type, 'DISCHARGE', p_admission_id, p_ip_address);

    RETURN json_build_object(
        'admission_id', p_admission_id,
        'room', v_room,
        'token', v_token
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. create_admission_transaction RPC
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
    -- Insert Admission
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

    -- Create Audit Log
    INSERT INTO audit_logs (actor_type, action, target_id, ip_address)
    VALUES (p_actor_type, 'CREATE', v_admission_id, p_ip_address);

    RETURN json_build_object(
        'id', v_admission_id,
        'access_token', v_token
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 4. view_station_dashboard (N+1 Fetching Optimization & Order)
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
