# [다른 LLM용] 스테이션 그리드 비어 있음 — DB·SQL 검증 프롬프트

> **사용법**: 아래 "---" 구간부터 끝까지 복사해 Claude, GPT 등 다른 LLM에 붙여 넣고,  
> **백엔드/DB/SQL 측 검증 절차**와 **근본 원인 가능성**을 분석·제안해 달라고 요청하세요.  
> (프론트 수정·Promise 공유 등은 이미 적용했으나 **더미 환자 생성 전까지 여전히 그리드에 데이터가 안 뜨는** 상황입니다.)

---

## 역할

당신은 백엔드·DB·Supabase/PostgreSQL 검증 전문가입니다. **GET /api/v1/admissions**가 최초 요청에서 빈 배열을 반환하거나, 뷰/RLS로 인해 데이터가 필터링되는지 검증할 수 있는 **체계적인 검증 절차**와 **가능한 원인·수정안**을 제시해 주세요.

---

## 1. 현상 정리

- **앱**: Eco-Pediatrics Station Control (Next.js + FastAPI, Supabase Postgres).
- **증상**: 스테이션 페이지 최초 로드 시 방별 카드 그리드가 **빈 슬롯만 표시**됨. DB에는 이미 `status IN ('IN_PROGRESS','OBSERVATION')` 인 입원이 있음.
- **우회 동작**: "DEV: 환자추가"로 더미 환자 생성 API를 한 번 호출한 뒤에는 그리드에 **기존 입원 포함** 데이터가 한 번에 채워짐.
- **이미 시도한 프론트 수정**: API 레이어 GET 중복 시 **진행 중인 Promise 공유**(가짜 `{}` 반환 제거), 초기 effect에서 `fetchAdmissions()` 스로틀 유지, 퇴원 후 `reload` 제거 후 `fetchAdmissions(true)` 호출. **그래도 최초 로드 시에는 여전히 빈 그리드.**

**가설**: **첫 번째 GET /api/v1/admissions 요청**이 백엔드/DB 단에서 빈 결과를 반환하거나, 뷰/RLS/키 설정으로 인해 행이 필터링되고 있을 가능성이 있음. 이에 대한 **SQL·DB·API 검증**이 필요함.

---

## 2. 백엔드 데이터 경로 요약

| 단계 | 위치 | 내용 |
|------|------|------|
| 진입 | `GET /api/v1/admissions` | FastAPI 라우터 |
| 라우터 | `backend/routers/admissions.py` | `list_admissions()` → `admission_service.list_active_admissions_enriched(db)` |
| 서비스 | `backend/services/admission_service.py` | `list_active_admissions_enriched(db)` |
| 쿼리 | 동일 파일 | `db.table("view_station_dashboard").select("*")` → **SQL 뷰** 사용, `admissions` 테이블 직접 조회 아님 |
| DB 클라이언트 | `backend/database.py` | `create_client(SUPABASE_URL, SUPABASE_KEY)` — **SUPABASE_KEY**가 anon vs service_role 인지에 따라 RLS 적용 여부 결정 |

---

## 3. SQL 뷰 정의 (검증 대상)

스테이션 목록 API는 **`admissions` 테이블이 아니라 `view_station_dashboard` 뷰**를 조회합니다.

**뷰 정의** (최신 마이그레이션: `supabase/migrations/20260222_view_token_expires_fix.sql`):

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
    a.id AS id,
    a.room_number,
    a.patient_name_masked AS display_name,
    a.access_token,
    a.token_expires_at,
    a.dob,
    a.gender,
    a.check_in_at,
    v.temperature AS latest_temp,
    v.recorded_at AS last_vital_at,
    CASE
        WHEN v.temperature >= 38.0 AND v.recorded_at >= (NOW() - INTERVAL '6 hours') THEN true
        ELSE false
    END AS had_fever_in_6h,
    i.infusion_rate AS iv_rate,
    i.photo_url AS iv_photo,
    m.request_type AS meal_type,
    m.pediatric_meal_type,
    m.guardian_meal_type,
    m.created_at AS meal_requested_at
FROM admissions a
LEFT JOIN latest_vitals v ON a.id = v.admission_id
LEFT JOIN latest_iv i ON a.id = i.admission_id
LEFT JOIN latest_meal m ON a.id = m.admission_id
WHERE a.status IN ('IN_PROGRESS', 'OBSERVATION')
ORDER BY a.check_in_at DESC;

GRANT SELECT ON public.view_station_dashboard TO anon;
GRANT SELECT ON public.view_station_dashboard TO authenticated;
```

- **RLS**: PostgreSQL에서 뷰는 기본적으로 **SECURITY INVOKER**. 즉, **요청 역할(anon/service_role)**로 뷰가 실행되고, 뷰 내부에서 참조하는 **admissions, vital_signs, iv_records, meal_requests** 각각에 대해 **해당 테이블의 RLS 정책**이 적용됨.

---

## 4. RLS 정책 (검증 시 반드시 확인할 것)

**admissions 테이블** (뷰의 주 데이터 소스):

- `ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;`
- anon이 스테이션 목록을 보려면 **SELECT 정책**이 필요함.  
  문서상 정의:  
  `CREATE POLICY "Enable read for active admissions" ON public.admissions FOR SELECT USING (status = 'IN_PROGRESS' OR status = 'OBSERVATION');`  
  → **이 정책이 실제 DB에 존재하는지**, anon 역할로 조회 시 적용되는지 확인 필요.

**vital_signs, iv_records, meal_requests** (뷰의 CTE에서 조회):

- 각각 RLS가 켜져 있고, SELECT 정책이 `EXISTS (SELECT 1 FROM admissions WHERE admissions.id = ... AND admissions.status = 'IN_PROGRESS')` 형태로 되어 있음.
- 뷰를 **anon**으로 조회할 때, 위 정책들이 anon 역할에 대해 **실제로 존재·적용**되는지 확인 필요.  
  (정책이 없으면 anon은 해당 테이블에서 0행만 보게 되어, 뷰 결과는 admissions만 있어도 JOIN 결과가 달라질 수 있으나, **admissions 행 자체가 0건이면 뷰 전체가 빈 결과**가 됨.)

**핵심 확인**:

1. **SUPABASE_KEY**: 백엔드 `.env`의 `SUPABASE_KEY`가 **anon**인지 **service_role**인지.  
   - anon → RLS 적용. `admissions`에 대한 anon용 SELECT 정책이 없거나 잘못되면 빈 결과.
   - service_role → RLS 무시. 정책 누락 문제는 아님.
2. **실제 DB에 정책 존재 여부**:  
   `SELECT * FROM pg_policies WHERE tablename = 'admissions';`  
   로 **"Enable read for active admissions"** (또는 동일 의도의 정책)가 있는지 확인.
3. **뷰가 anon으로 행을 반환하는지**:  
   Supabase SQL Editor에서 **역할을 anon으로 두거나**, `SET ROLE anon;` 후 `SELECT * FROM view_station_dashboard;` 실행해 보는 절차 제안.

---

## 5. 백엔드 서비스 코드 (참고)

```python
# backend/services/admission_service.py
async def list_active_admissions_enriched(db: AsyncClient):
    res = await execute_with_retry_async(db.table("view_station_dashboard").select("*"))
    data = res.data or []
    # ... data를 enriched 리스트로 변환 후 반환
    return enriched
```

- `res.data`가 이미 빈 리스트이면 프론트는 빈 배열만 받음.
- **execute_with_retry_async**: 5xx/429 시 재시도. 2xx이면 `res.data`를 그대로 반환.  
  → **첫 요청에서 200이면서 `data == []`**인지, 아니면 에러/타임아웃이 나는지 구분해 보는 것이 중요함.

---

## 6. 검증 요청 사항 (타 LLM이 제안할 내용)

다음에 대한 **구체적인 검증 절차**와 **가능한 원인·수정안**을 제시해 주세요.

1. **Supabase에서 뷰 결과 직접 확인**
   - SQL Editor에서 `SELECT * FROM view_station_dashboard;` 실행 시 **현재 로그인/역할**로 몇 건이 나오는지.
   - 가능하다면 **anon 역할로** 동일 쿼리 실행 방법(예: `SET ROLE anon;` 또는 Dashboard에서 anon 키로 API 호출)과, 그때 행이 0건이 되는지 여부.

2. **admissions 테이블 RLS 및 정책**
   - `admissions`에 anon용 SELECT 정책이 **실제로 존재**하는지 확인하는 SQL.
   - 정책이 없을 때 anon으로 `SELECT * FROM admissions WHERE status IN ('IN_PROGRESS','OBSERVATION');` 결과가 빈지 여부.

3. **백엔드에서 첫 요청 응답 확인**
   - FastAPI 로그에 `GET /api/v1/admissions` 200 응답 시 body 길이 또는 로그 한 줄 추가로 **첫 요청에서 `enriched` 길이가 0인지** 확인하는 방법.
   - 또는 `curl -s http://127.0.0.1:8000/api/v1/admissions | jq length` 를 **앱 최초 기동 직후** 한 번 호출했을 때 0이 나오는지 여부.

4. **SUPABASE_KEY 구분**
   - `.env`의 `SUPABASE_KEY`가 anon key인지 service_role key인지 확인하는 방법(값 형식·위치 등).
   - anon인 경우, 위 RLS 정책이 없으면 빈 결과가 나올 수 있음을 명시.

5. **가능한 원인 정리**
   - (A) anon 키 사용 + admissions에 anon용 SELECT 정책 없음 → 뷰가 0행 반환.
   - (B) 뷰 또는 CTE 참조 테이블 중 하나에 anon 정책이 과도하게 제한적이라, 실제로는 있는 admissions 행이 뷰 실행 시 필터링됨.
   - (C) 첫 요청만 실패(타임아웃·연결 실패)하고 재시도/두 번째 요청에서만 성공하는 경우 (그럴 경우 프론트에서 “첫 응답이 빈 배열”로 처리될 수 있음).
   - (D) 그 외 (스키마 캐시, 뷰 정의와 실제 컬럼 불일치 등).

6. **수정 제안**
   - RLS 정책이 없거나 잘못된 경우: **admissions**(및 필요 시 관련 테이블)에 anon용 SELECT 정책을 추가/수정하는 SQL.
   - 백엔드가 반드시 “스테이션용”으로만 쓴다면: **service_role** 사용으로 RLS 우회 방안 (보안 영향 간단히 언급).
   - 검증용 로그 추가: `list_active_admissions_enriched` 내부에서 `len(data)` 또는 `len(enriched)`를 로그로 남겨 첫 요청이 빈 배열인지 확인하는 코드 제안.

---

## 7. 핵심 파일 경로

| 구분 | 경로 |
|------|------|
| API 라우터 | `backend/routers/admissions.py` |
| 서비스(뷰 조회) | `backend/services/admission_service.py` |
| DB 클라이언트 초기화 | `backend/database.py` |
| 뷰 정의 마이그레이션 | `supabase/migrations/20260222_view_token_expires_fix.sql` |
| RLS·정책 참고 스키마 | `supabase/schema.sql` (admissions 정책 등) |
| RLS 활성화 마이그레이션 | `supabase/migrations/20260220_enable_rls_all.sql` |
| 재시도 유틸 | `backend/utils.py` (`execute_with_retry_async`) |

---

## 8. 로컬에서 바로 해볼 수 있는 명령 (참고)

- 백엔드 기동 후 **첫 요청**에서 응답 길이 확인:
  - PowerShell: `(Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/admissions" -UseBasicParsing).Content | ConvertFrom-Json | Measure-Object | Select-Object -ExpandProperty Count`
  - 또는 브라우저 개발자 도구 Network에서 `/api/v1/admissions` 첫 요청의 **Response body**가 `[]` 인지 확인.

위 현상·코드·뷰·RLS 맥락을 바탕으로 **DB·SQL·API 단 검증 절차**와 **근본 원인 후보·수정안**을 제시해 주세요.
