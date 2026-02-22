# CRITICAL_LOGIC (Single Source of Truth)

이 문서는 `eco_pediatrics` 프로젝트의 **중심 축(Pivot)**이 되는 비즈니스 로직과 아키텍처 원칙을 정의합니다. 모든 코드 수정은 본 문서의 원칙과 충돌해서는 안 되며, 의도적인 변경 시에는 시니어 아키텍트의 승인 하에 본 문서를 먼저 업데이트해야 합니다.

---

## 1. Immutable Core: 도메인 불변 원칙
절대적으로 준수해야 하는 최상위 도메인 규칙입니다.

### 1.1 표준 시간대 (Single Timezone)
- **표준**: **Asia/Seoul (KST, UTC+9)**
- **정의**: 서버, DB, 클라이언트 모두 이 시간대를 기준으로 작동한다.
- **방어**: 클라이언트의 시스템 시간(Local Time)을 절대 신뢰하지 않는다. 모든 날짜/시간 처리는 `dateUtils.ts`의 KST 헬퍼를 경유해야 한다.
- **입원 일차(Hospital Day)**: 입원 날짜를 **1일차**로 정의하며, 시각에 관계없이 날짜가 변경될 때마다 카운트를 증가시킨다.

### 1.2 보안 및 접근 제어 (Secured QR)
- **인증**: 입원 시 생성되는 UUID 기반 `access_token`이 유일한 권한 증명이다.
- **권한(RLS)**: 데이터베이스 레벨(Supabase RLS)에서 `status = 'IN_PROGRESS'` 또는 `'OBSERVATION'`인 환자만 조회가 가능하도록 강제한다.
- **퇴원 시 처리**: 퇴원 즉시 토큰을 무효화하며, 보호자 대시보드는 즉시 세션을 종료(`window.close` 또는 리다이렉트)해야 한다.

---

## 2. Technical Architecture: 기술 제약 및 패턴
일관된 코드 품질을 유지하기 위한 기술적 가이드라인입니다.

### 2.1 레이어드 아키텍처 (Layered Architecture)
- **Backend**: `Router` (진입/DTO) -> `Service` (Business Logic) -> `Utils/Repo` (Infra) 순서를 엄격히 준수한다.
- **Frontend**: 비즈니스 로직은 최대한 커스텀 훅(`hooks/`)으로 추출하여 컴포넌트(`components/`)의 순수성을 유지한다.

### 2.2 실시간 동기화 프로토콜 (Sync Strategy)
- **Hybrid Sync**: WebSocket 브로드캐스트는 '트리거' 역할만 수행하며, 실제 데이터 업데이트는 클라이언트에서의 명시적 Refetch를 통해 정합성을 확보한다.
- **Throttling**: 중복 fetch 방지를 위해 모든 API 호출 훅에는 최소 **500ms의 `lastFetchRef` 가드**를 적용해야 한다.

### 2.3 DB Update 최적화 (supabase-py 호환)
- **supabase-py v2+ 제약**: `UpdateRequestBuilder`/`DeleteRequestBuilder`는 `.select()` 메서드를 지원하지 않는다. `update().eq().select()` 체이닝은 **불가**.
- **권장 패턴 (2단계 분리)**: (1) `update().eq()` 또는 `delete().eq()` 실행. (2) 브로드캐스트·응답용 데이터가 필요하면 **별도** `select().eq()` 호출.
- 예시: `await db.table("requests").update({"status": "done"}).eq("id", id).execute()` → `await db.table("requests").select("*").eq("id", id).single().execute()`
- **목적**: 네트워크 왕복은 2회 발생하나, 라이브러리 호환성과 에러 방지가 우선. 상세 사례는 `docs/TROUBLESHOOTING.md` §11 참고.

---

## 3. Environment & Configuration
환경 변수 의존성 및 설정 무결성. 환경 이전/신규 구축 시 휴먼 에러 방지를 위한 SSOT입니다.

### 3.1 UI Visibility Control (DEV UI)
- **Variable:** `NEXT_PUBLIC_ENABLE_DEV_UI`
- **Logic:** `frontend/src/app/station/page.tsx`에서 해당 값이 `true`일 때만 개발자 전용 버튼(전체퇴원, 환자추가)을 렌더링함.
- **Constraint:** Next.js 빌드 타임 주입 변수이므로, 수정 후 반드시 **개발 서버 재시작**이 필요함.

### 3.2 Verification
- 환경 이전 또는 신규 구축 시 `backend/tests/test_env_integrity.py`를 실행하여 설정 무결성을 검증해야 함.
- 검증 명령(backend 디렉터리 기준): `pytest tests/test_env_integrity.py -v`

### 3.3 Dashboard Data Contract (Backend → Frontend)
대시보드 API(`fetch_dashboard_data`)는 반드시 다음 컬럼들을 포함해야 하며, 명칭 변경 시 프론트엔드와 합의가 필요함.

1. **admission**: id, patient_name_masked, room_number, status, discharged_at, access_token, dob, gender, check_in_at, **display_name**(필수 가공 필드)
2. **vitals**: id, admission_id, temperature, has_medication, medication_type, recorded_at
3. **iv_records**: id, admission_id, photo_url, infusion_rate, created_at
4. **meals**: id, admission_id, request_type, pediatric_meal_type, guardian_meal_type, requested_pediatric_meal_type, requested_guardian_meal_type, room_note, meal_date, meal_time, status, created_at
5. **exam_schedules**: id, admission_id, scheduled_at, name, note
6. **document_requests**: id, admission_id, request_items, status, created_at

### 3.4 Token Expiration Handling (Client-side)
- **Status 404/403:** 토큰이 무효하거나 퇴원 처리가 완료된 것으로 간주함.
- **Client Action:** 프론트엔드는 즉시 이후 대시보드 fetch를 중단하고(토큰 무효화 ref 설정), 사용자에게 서비스 종료 알림(Alert)을 노출한 후 세션을 종료(창 닫기 또는 리다이렉트)해야 함. WebSocket은 4003/1000 시 재연결 중단.

---

## 4. Business Workflows: 핵심 업무 프로세스
복잡한 상태 전이가 일어나는 비즈니스 흐름입니다.

### 4.1 식단 신청 및 승인 (Meal Workflow)
- **슬롯 결정**: `getNextThreeMealSlots` 로직(06시, 14시, 19시 분기)에 따라 표시할 식사 슬롯을 결정한다.
- **상태 관리**: 보호자의 신청은 `requested_*` 필드에 임시 저장되며, 간호 스테이션의 '완료' 처리가 있어야만 실제 식단 필드로 전이된다. 수락 전까지 UI는 기존 식단을 유지한다.

### 4.2 수액 모니터링 (IV Monitoring)
- **표준 단위**: 병원 현장 표준에 따라 모든 수액 주입 속도는 **`cc/hr`** 단위를 사용한다.
- **데이터 구조**: `IV_Records`는 반드시 확인 시각과 현재 속도 정보를 포함해야 한다.

---

## 5. Safety Guardrails: 수정 시 필수 점검 사항 (Checklist)
특정 모듈 수정 시 반드시 함께 검토해야 하는 부수 효과 리스트입니다.

- [ ] **바이탈/체온 수정 시**: `TemperatureGraph.tsx`의 X축 KST Midnight 정렬 로직이 깨지지 않는지 확인.
- [ ] **입원/전실/퇴원 로직 수정 시**: `audit_logs` 테이블에 활동 내역이 기록되는지 확인.
- [ ] **API 엔드포인트 수정 시**: 해당 데이터를 참조하는 WebSocket 브로드캐스트 로직(`broadcast_to_room` 등)이 누락되지 않았는지 확인.
- [ ] **UI 컴포넌트 수정 시**: `mask_name` 유틸리티가 적용되어 환자 성함이 노출되지 않는지 확인.

---
## 6. Skill & Agent Maintenance: 에이전트 및 스킬 관리
에이전트의 지능형 파트너십 유지를 위한 관리 프로토콜입니다.

### 6.1 스킬 배포 프로토콜 (Skill Deployment)
- **SSOT**: 사용자 정의 스킬의 최상위 저장소는 **`https://github.com/savior714/skills`**이다.
- **푸시 절차 (@skills push)**:
  1. `.agent/skills/` 하위의 신규/수정 스킬 리스트업 및 사용자 제안.
  2. 로컬 클론 저장소(`c:\develop\skills`)의 `git pull` 상태 확인 및 정합성 검증.
  3. Conventional Commits 형식(`feat: add [name] skill`)으로 커밋 및 푸시.
- **저장소 분리**: `antigravity-awesome-skills` 레포지토리와는 별개로 운영되며, 명시적 요청이 없는 한 `savior714/skills`를 우선 타겟으로 한다.

---
*본 문서는 프로젝트의 헌법과 같습니다. 에이전트는 모든 Action 전 본 문서를 복귀하십시오.*
