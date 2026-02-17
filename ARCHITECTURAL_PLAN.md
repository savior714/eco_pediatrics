# PID System: Architectural Optimization Plan (Pseudocode)

## 1. Database Integrity & Atomicity (RPCs)
**Goal:** Prevent race conditions (duplicate admissions in one room) and ensure Audit Logs are never missed (rollback on failure).

### 1.1 `transfer_patient_transaction` (RPC)
This stored procedure handles the critical `transfer` logic atomically.

```sql
CREATE OR REPLACE FUNCTION transfer_patient_transaction(
    p_admission_id UUID,
    p_target_room TEXT,
    p_actor_type TEXT, -- e.g. 'NURSE'
    p_ip_address TEXT
) RETURNS JSON AS $$
DECLARE
    v_old_room TEXT;
    v_token UUID;
    v_status TEXT;
BEGIN
    -- 1. Validate Target Room Availability (Race Condition Fix)
    -- Lock target room check if necessary, or rely on serializable isolation
    IF EXISTS (
        SELECT 1 FROM admissions
        WHERE room_number = p_target_room
          AND status IN ('IN_PROGRESS', 'OBSERVATION')
    ) THEN
        RAISE EXCEPTION 'Room % is occupied', p_target_room;
    END IF;

    -- 2. Get Current State & Lock Row
    SELECT room_number, access_token, status INTO v_old_room, v_token, v_status
    FROM admissions WHERE id = p_admission_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Admission not found'; END IF;
    IF v_status NOT IN ('IN_PROGRESS', 'OBSERVATION') THEN
        RAISE EXCEPTION 'Patient is not active';
    END IF;

    -- 3. Perform Update
    UPDATE admissions
    SET room_number = p_target_room, updated_at = NOW()
    WHERE id = p_admission_id;

    -- 4. Create Audit Log (Critical Step - Rollback on Failure)
    INSERT INTO audit_logs (actor_type, action, target_id, ip_address, details)
    VALUES (p_actor_type, 'TRANSFER', p_admission_id, p_ip_address,
            jsonb_build_object('from', v_old_room, 'to', p_target_room));

    -- 5. Return Data for Broadcast
    RETURN json_build_object(
        'admission_id', p_admission_id,
        'old_room', v_old_room,
        'new_room', p_target_room,
        'token', v_token
    );
END;
$$ LANGUAGE plpgsql;
```

### 1.2 `discharge_patient_transaction` (RPC)
Simpler, but critical for ensuring the discharge timestamp and log are recorded together.

```sql
CREATE OR REPLACE FUNCTION discharge_patient_transaction(
    p_admission_id UUID,
    p_actor_type TEXT,
    p_ip_address TEXT
) RETURNS JSON AS $$
DECLARE
    v_room TEXT;
    v_token UUID;
BEGIN
    -- Atomic Update
    UPDATE admissions
    SET status = 'DISCHARGED', discharged_at = NOW()
    WHERE id = p_admission_id
    RETURNING room_number, access_token INTO v_room, v_token;

    IF NOT FOUND THEN RAISE EXCEPTION 'Admission not found'; END IF;

    -- Atomic Log
    INSERT INTO audit_logs (actor_type, action, target_id, ip_address)
    VALUES (p_actor_type, 'DISCHARGE', p_admission_id, p_ip_address);

    RETURN json_build_object(
        'admission_id', p_admission_id,
        'room', v_room,
        'token', v_token
    );
END;
$$ LANGUAGE plpgsql;
```

---

## 2. Dashboard Read Performance (SQL View)
**Goal:** Eliminate N+1 queries and Python-side filtering. Fetch the exact "dashboard state" in one query.

### 2.1 `view_station_dashboard`
This view pre-calculates the "latest state" for the dashboard.

```sql
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
    a.id as admission_id,
    a.room_number,
    a.patient_name_masked as display_name,
    a.access_token,
    a.dob,
    a.gender,
    a.check_in_at,
    -- Vitals Logic (Moved from Python)
    v.temperature as latest_temp,
    v.recorded_at as last_vital_at,
    CASE
        WHEN v.temperature >= 38.0
             AND v.recorded_at >= (NOW() - INTERVAL '6 hours') THEN true
        ELSE false
    END as had_fever_in_6h,
    -- IV Logic
    i.infusion_rate as iv_rate,
    i.photo_url as iv_photo,
    -- Meal Logic
    m.request_type as meal_type,
    m.pediatric_meal_type,
    m.guardian_meal_type,
    m.created_at as meal_requested_at
FROM admissions a
LEFT JOIN latest_vitals v ON a.id = v.admission_id
LEFT JOIN latest_iv i ON a.id = i.admission_id
LEFT JOIN latest_meal m ON a.id = m.admission_id
WHERE a.status IN ('IN_PROGRESS', 'OBSERVATION');
```

*Impact:* `list_active_admissions_enriched` in Python becomes a single call: `supabase.table('view_station_dashboard').select('*').execute()`.

---

## 3. WebSocket Architecture (Single Server Optimization)
**Goal:** Simplify `ConnectionManager` for reliability. Remove complex snapshot/retry logic if not needed for single-threaded asyncio loop.

### 3.1 Simplified Broadcast Logic (Python Pseudocode)
The current implementation has complex removal logic. For a single server, we can simplify:

```python
class ConnectionManager:
    def __init__(self):
        # Map: Token -> Set of WebSocket objects
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, token: str):
        await websocket.accept()
        if token not in self.active_connections:
            self.active_connections[token] = set()
        self.active_connections[token].add(websocket)

    def disconnect(self, websocket: WebSocket, token: str):
        if token in self.active_connections:
            self.active_connections[token].discard(websocket)
            if not self.active_connections[token]:
                del self.active_connections[token]

    async def broadcast(self, message: str, token: str):
        if token not in self.active_connections:
            return

        # 1. Snapshot connections to avoid modification during iteration
        live_sockets = list(self.active_connections[token])
        dead_sockets = []

        # 2. Parallel Send
        async def send_safe(ws):
            try:
                # Fast timeout to prevent blocking the loop
                await asyncio.wait_for(ws.send_text(message), timeout=1.5)
            except Exception:
                dead_sockets.append(ws)

        if live_sockets:
            await asyncio.gather(*(send_safe(ws) for ws in live_sockets))

        # 3. Cleanup Dead Sockets
        # Note: In single-threaded asyncio, self.active_connections won't change
        # structure *during* the await, but let's be safe.
        if token in self.active_connections:
            for ds in dead_sockets:
                self.active_connections[token].discard(ds)
            if not self.active_connections[token]:
                del self.active_connections[token]
```

## 4. Execution Strategy
1.  **Migration:** Apply SQL for RPCs and Views.
2.  **Backend:** Refactor `admission_service.py` to use `rpc()` and `table('view_station_dashboard')`.
3.  **Refactor:** Update `websocket_manager.py` with the simplified logic.
4.  **Testing:** Verify `transfer` fails if room occupied; verify logs are written.

### 1.3 Strict Data Integrity (Constraint)
To strictly enforce the "one patient per room" rule at the database level (preventing race conditions even across transactions), add a partial unique index:

```sql
CREATE UNIQUE INDEX idx_unique_active_room
ON admissions (room_number)
WHERE status IN ('IN_PROGRESS', 'OBSERVATION');
```

## 5. Security & Access Control (Secured QR)
보호자용 대시보드는 사용자 편의를 위해 **비로그인(Anonymous)** 방식을 채택하며, 보안은 다음 계층에서 담보합니다.

- **Unique Entry (UUID Token)**: 입원 시마다 고유한 `access_token`을 생성하여 QR 코드에 내장.
- **RLS Enforcement**: 모든 DB 쿼리는 `admissions.status = 'IN_PROGRESS'` 필터를 데이터베이스 레벨(Row Level Security)에서 강제 적용하여 퇴원 후 접근을 차단.
- **Audit Logging**: 모든 접근 시 클라이언트 IP와 액션을 감사 로그(`audit_logs`)에 기록.
