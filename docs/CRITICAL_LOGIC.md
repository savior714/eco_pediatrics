# CRITICAL_LOGIC (Single Source of Truth)

이 문서는 `eco_pediatrics` 프로젝트의 **중심 축(Pivot)**이 되는 비즈니스 로직과 아키텍처 원칙을 정의합니다. 모든 코드 수정은 본 문서의 원칙과 충돌해서는 안 되며, 의도적인 변경 시에는 시니어 아키텍트의 승인 하에 **본 문서를 먼저 업데이트**해야 합니다.

**목차**
1. [Immutable Core](#1-immutable-core-도메인-불변-원칙) — 도메인 불변 원칙 (시간대, 보안/QR)
2. [Technical Architecture](#2-technical-architecture-기술-제약-및-패턴) — 레이어, 동기화, 모달 SSOT, DB 업데이트, 인코딩
3. [Environment & Configuration](#3-environment--configuration) — DEV UI, 검증, 데이터 계약, 토큰 처리, 의존성, 빌드 환경
4. [Business Workflows](#4-business-workflows-핵심-업무-프로세스) — 식단, 수액
5. [Safety Guardrails](#5-safety-guardrails-수정-시-필수-점검-사항-checklist) — 수정 시 점검 체크리스트
6. [Skill & Agent Maintenance](#6-skill--agent-maintenance-에이전트-및-스킬-관리) — 스킬 배포 프로토콜

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

### 2.3 상세 모달 데이터 소스 (Patient Detail Modal SSOT)
- **SSOT**: 환자 상세 모달(PatientDetailModal)의 데이터 소스는 자체 Hook(`useVitals`)의 상태를 최우선으로 사용한다.
- **외부 Prop**: 부모(Station Page)로부터 주입되는 `propVitals` 등은 초기 진입 시점에만 참조하며, 모달 열린 후에는 사용하지 않는다. 이는 부모 상태 갱신 시 유입되는 Thin Object로 인한 리셋 현상을 방지하기 위함이다.
- **상태 보존**: `useVitals.fetchDashboardData`는 API 응답에 특정 필드가 없거나 비어 있을 경우 기존 상태를 빈 배열로 덮어쓰지 않는다. 유효한 데이터가 있을 때만 상태를 업데이트한다.
- **Force 리프레시 우선**: `fetchDashboardData({ force: true })` 호출 시에는 시퀀스 가드를 우회하여 해당 응답을 항상 상태에 반영한다. 수동 완료(예: 서류 완료 버튼) 직후 리프레시가 웹소켓/디바운스 요청에 의해 무시되지 않도록 함. 상세는 `docs/prompts/PROMPT_COMPLETED_DOCS_NOT_SHOWING.md` 근본 원인 분석 참고.

### 2.4 DB Update 최적화 (supabase-py 호환)
- **supabase-py v2+ 제약**: `UpdateRequestBuilder`/`DeleteRequestBuilder`는 `.select()` 메서드를 지원하지 않는다. `update().eq().select()` 체이닝은 **불가**.
- **권장 패턴 (2단계 분리)**: (1) `update().eq()` 또는 `delete().eq()` 실행. (2) 브로드캐스트·응답용 데이터가 필요하면 **별도** `select().eq()` 호출.
- 예시: `await db.table("requests").update({"status": "done"}).eq("id", id).execute()` → `await db.table("requests").select("*").eq("id", id).single().execute()`
- **목적**: 네트워크 왕복은 2회 발생하나, 라이브러리 호환성과 에러 방지가 우선. 상세 사례는 `docs/TROUBLESHOOTING.md` §11 참고.

### 2.5 Modern Backend Standards (FastAPI & Supabase v2)
- **Dependency Injection**: 모든 FastAPI 핸들러는 `Annotated[T, Depends()]` 패턴을 사용하여 의존성을 주입한다.
- **Supabase Client**: 레거시 내부 임포트(`supabase._async.client`)를 절대 사용하지 않으며, 반드시 메인 패키지(`from supabase import AsyncClient`)에서 임포트한다.
- **Type Hinting**: Python 3.14 표준에 따라 제네릭 컬렉션은 `list[T]`, `dict[K, V]` 등 소문자 내장 타입을 사용하여 선언한다.

### 2.6 Environment Maintenance (인코딩 원칙)
- **배치 파일 (.bat, .cmd)**: 반드시 **ANSI(CP949/EUC-KR)** 인코딩을 유지한다. `cmd.exe`는 UTF-16/UTF-8 BOM을 잘못 해석하여 `'cho'`(echo), `'edelayedexpansion'`(EnableDelayedExpansion) 등 구문 파편화로 창이 즉시 닫힌다.
- **표준 도구 (uv Standard)**: 백엔드뿐만 아니라 프론트엔드 도구(npm, node)도 uv run --with nodejs@24.12.0 ... 형식을 통해 호출함으로써 툴체인의 일관성을 확보한다.
- **수정 시**: 배치만 IDE에서 Save with Encoding -> Korean (EUC-KR) 또는 Western (Windows 1252)로 저장. 에이전트는 배치 파일 수정 시 인코딩을 변경하지 않는다.

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
6. **document_requests**: id, admission_id, request_items, status, created_at. **상태 필터 금지**: PENDING·COMPLETED 구분 없이 해당 입원의 최근 요청을 반환한다. 상세 모달의 "신청된 서류" 섹션에 완료 이력을 노출하기 위함이다.

### 3.4 Token Expiration Handling (Client-side)
- **Status 404/403:** 토큰이 무효하거나 퇴원 처리가 완료된 것으로 간주함.
- **Client Action:** 프론트엔드는 즉시 이후 대시보드 fetch를 중단하고(토큰 무효화 ref 설정), 사용자에게 서비스 종료 알림(Alert)을 노출한 후 세션을 종료(창 닫기 또는 리다이렉트)해야 함. WebSocket은 4003/1000 시 재연결 중단.
- **Error Masking (Graceful Degradation):** 응답 메시지에 `Invalid or inactive admission token`이 포함된 404/403은 정상 방어로 간주하고, `console.error`·에러 오버레이를 띄우지 않고 `console.warn`만 출력한 뒤 리다이렉트를 진행한다. 상세는 `docs/SESSION_2026-02-23.md` §1 참고.

### 3.5 Backend Dependency Layers (의존성 계층)
- **Core(웹 서비스)**: `backend/requirements-core.txt`에 fastapi, uvicorn, pydantic 등 빌드 불필요 패키지만 포함. C++ 확장 없이 설치 가능.
- **Full(전체 실행)**: `requirements.txt`는 supabase를 포함하며, supabase는 storage3→pyiceberg→pyroaring 경로로 C++ 빌드가 필요한 의존성을 갖는다.
- **빌드 환경 미구성 시**: `uv pip install -r requirements-core.txt`로 Core만 우선 설치. 백엔드 실제 실행에는 supabase 필수이므로, Visual Studio Build Tools + **Windows SDK(UCRT, io.h 포함)** 설치 후 `vcvars64.bat`으로 INCLUDE/LIB 경로 주입하여 `uv pip install -r requirements.txt` 또는 pyiceberg·pyroaring 별도 설치가 필요하다.
- **데이터 분석용 모듈**(pyiceberg, pyroaring 등)은 현재 스테이션 대시보드·환자 상세 모달 기능과 무관하나, **storage3가 런타임에 pyiceberg를 import**하므로 `--no-deps` 우회 설치로는 supabase 기동 불가. pyiceberg 빌드가 반드시 필요함.
- **의존성 설치 예외 규정(장기)**: Windows Native 환경에서 C++ 빌드 도구·SDK 미비 시, `vcvars64.bat` 환경 주입 후 pyroaring/pyiceberg 선 설치를 시도한다. 이는 storage3→pyiceberg의 런타임 의존성으로 인해 우회 불가하기 때문이다.

### 3.6 Build Environment Discovery (환경 변수 SSOT)
- **문제**: `cl.exe`가 실행되더라도 Windows SDK(UCRT)의 버전별 가변 경로가 `INCLUDE`에 없으면 `io.h` 참조 실패. 세션별 `vcvars64.bat`은 휘발적이라 IDE·터미널 재시작 시 경로가 유실됨.
- **해결**: `scripts/Refresh-BuildEnv.ps1`을 실행하여 최신 Windows SDK(UCRT, shared, um, winrt) 경로를 **사용자 환경 변수에 영구 등록**한다. 일시적 세션 주입이 아닌, 시스템 수준의 **환경 변수 SSOT** 확보가 목적이다.
- **실행**: `eco setup` 시 자동 호출. 수동 실행: `powershell -ExecutionPolicy Bypass -File scripts\Refresh-BuildEnv.ps1`. 실행 후 **모든 터미널과 IDE를 재시작**해야 영구 설정이 적용된다.

---

## 4. Business Workflows: 핵심 업무 프로세스
복잡한 상태 전이가 일어나는 비즈니스 흐름입니다.

### 4.1 식단 신청 및 승인 (Meal Workflow)
- **슬롯 결정**: `getNextThreeMealSlots` 로직(06시, 14시, 19시 분기)에 따라 표시할 식사 슬롯을 결정한다.
- **상태 관리**: 보호자의 신청은 `requested_*` 필드에 임시 저장되며, 간호 스테이션의 '완료' 처리가 있어야만 실제 식단 필드로 전이된다. 수락 전까지 UI는 기존 식단을 유지한다.

### 4.2 수액 모니터링 및 라벨 인쇄 (IV Monitoring & Printing)
- **표준 단위**: 병원 현장 표준에 따라 모든 수액 주입 속도는 cc/hr 단위를 사용한다.
- **처방 위계 (Hierarchy)**: 'Base Fluid(메인 수액)'와 'Mixed Meds(부가 약물)'를 분리 관리하며, 메인 수액은 처방의 대제목으로 기능한다.
- **약물 투여 규칙**: 항생제는 용량(**mg**) 단위를 기본으로 하며, 필요한 경우 투여 빈도(**QD, BID, TID**)를 명시한다. 기타 일반 약물은 앰플(**amp**) 단위를 사용한다.
- **UI 표준 (Density)**: 모든 입력 요소는 **48px (h-12)** 높이를 준수하며, 수액 선택과 속도 입력은 수평 배치를 원칙으로 한다.
- **안전 규칙**: 속도 변경 시 반드시 새로운 라벨지를 인쇄하여 수액백에 부착해야 하며, 라벨지에는 환자 식별 정보, 속도(cc/hr 및 gtt/min), 인쇄 시각이 포함되어야 한다.
- **인쇄 아키텍처**: Tauri Bridge(Rust)를 통해 b-PAC SDK와 통신하며, .lbx 템플릿 기반으로 실시간 데이터를 매핑하여 출력한다.

---

## 5. Safety Guardrails: 수정 시 필수 점검 사항 (Checklist)
특정 모듈 수정 시 반드시 함께 검토해야 하는 부수 효과 리스트입니다.

- [ ] **바이탈/체온 수정 시**: `TemperatureGraph.tsx`의 X축 KST Midnight 정렬 로직이 깨지지 않는지 확인.
- [ ] **입원/전실/퇴원 로직 수정 시**: `audit_logs` 테이블에 활동 내역이 기록되는지 확인.
- [ ] **API 엔드포인트 수정 시**: 해당 데이터를 참조하는 WebSocket 브로드캐스트 로직(`broadcast_to_room` 등)이 누락되지 않았는지 확인.
- [ ] **UI 컴포넌트 수정 시**: `mask_name` 유틸리티가 적용되어 환자 성함이 노출되지 않는지 확인.

### 5.1 메모리 누수 방지 원칙 (Memory Safety)

**Frontend**
- `setTimeout`/`setInterval` 생성 시 반드시 ID를 `useRef`에 보관하고, `useEffect` cleanup에서 `clearTimeout`/`clearInterval` 호출.
- `useCallback` 내부에서 타이머를 교체하는 debounce 패턴은 컴포넌트 수명과 별개이므로, 별도 `useEffect(() => () => clearTimeout(ref.current), [])` cleanup 필수.
- `api.ts`의 GET 요청은 30초 `AbortController` timeout이 적용됨. 응답이 30초를 초과하면 abort 에러로 간주되어 재시도 로직 적용.

**Backend**
- `asyncio.create_task()` 사용 시 반드시 반환값을 변수에 저장하고 `task.add_done_callback(lambda t: t.exception() if not t.cancelled() else None)` 추가. 미추적 태스크는 GC 시 예외가 silent-discard 됨.
- fire-and-forget 태스크 내부 DB 쿼리에는 `asyncio.wait_for(coro, timeout=10.0)`으로 감싸 좀비 태스크 방지.
- WebSocket `receive_text()` 루프는 `asyncio.wait_for(timeout=120)` 적용. 타임아웃 시 `close(1001)`로 연결 종료. `manager.disconnect()`는 반드시 `finally` 블록에서 호출.

---

## 6. Skill & Agent Maintenance: 에이전트 및 스킬 관리
에이전트의 지능형 파트너십 유지를 위한 관리 프로토콜입니다.

### 6.1 스킬 배포 프로토콜 (Skill Deployment)
- **SSOT**: 공식 지원 스킬은 **`repomix`** 단일 체제로 운영하며, 최상위 저장소는 `https://github.com/savior714/skills`이다.
- **관리 원칙**: 컨텍스트 품질 유지를 위해 불필요한 레거시 스킬은 배제하고, `repomix`를 통한 컨텍스트 최적화에 집중한다.
- **푸시 절차 (@skills push)**:
  1. `plugins/repomix/` 하위의 변경 사항 발생 시 사용자 제안.
  2. 외부 리포지토리(`c:\develop\skills`)와 동기화 및 검증 후 Conventional Commits 형식으로 푸시.

---

*본 문서는 프로젝트의 헌법과 같습니다. 에이전트는 모든 Action 전 본 문서를 참조하십시오.*
