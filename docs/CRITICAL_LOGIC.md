# CRITICAL_LOGIC (Single Source of Truth)

이 문서는 `eco_pediatrics` 프로젝트의 **중심 축(Pivot)**이 되는 비즈니스 로직과 아키텍처 원칙을 정의합니다. 모든 코드 수정은 본 문서의 원칙과 충돌해서는 안 되며, 의도적인 변경 시에는 시니어 아키텍트의 승인 하에 **본 문서를 먼저 업데이트**해야 합니다.

**목차**
1. [Immutable Core](#1-immutable-core-도메인-불변-원칙) — 도메인 불변 원칙 (시간대, 보안/QR)
2. [Technical Architecture](#2-technical-architecture-기술-제약-및-패턴) — 레이어, 동기화, 모달 SSOT, DB 업데이트, TS 코드 품질
3. [Environment & Configuration](#3-environment--configuration) — DEV UI, 검증, 데이터 계약, 토큰 처리, 의존성, 빌드 환경
4. [Business Workflows](#4-business-workflows-핵심-업무-프로세스) — 식단, 수액
5. [Safety Guardrails](#5-safety-guardrails-수정-시-필수-점검-사항-checklist) — 수정 시 점검 체크리스트

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

### 2.2 실시간 동기화 프로토콜 (Sync Strategy — React Query 기반)
- **서버 상태 캐시 SSOT**: 모든 서버 데이터는 `@tanstack/react-query` 캐시를 유일한 진실의 원천으로 관리한다. 컴포넌트 로컬 `useState`로 서버 데이터를 보유하는 것을 금지한다.
- **WS 이벤트 처리 분기 (필수 준수)**:
  - `setQueryData(즉시 패치)` — WS로 완전한 데이터가 전달되는 경우 (NEW_VITAL, NEW_IV, NEW_MEAL_REQUEST, NEW_EXAM_SCHEDULE). 네트워크 요청 없이 캐시를 직접 수술한다.
  - `invalidateQueries(재fetch)` — 그리드 구조 전체가 바뀌는 경우 (ADMISSION_DISCHARGED, ADMISSION_TRANSFERRED, REFRESH_DASHBOARD). 캐시를 무효화하여 React Query가 자동 재호출한다.
- **Optimistic Update**: 사용자 입력 즉시 캐시에 임시 데이터(`isOptimistic: true`)를 추가하고, WS 수신 시 실제 데이터로 교체. 실패 시 `rollback()`으로 되돌린다. `queryClient.setQueryData()`를 통해 구현한다.
- **중복 fetch 방지**: React Query의 `staleTime` 및 캐시 키 관리로 처리. 수동 `lastFetchRef` 가드는 React Query 마이그레이션 완료 이후 불필요하다.

### 2.3 상세 모달 데이터 소스 (Patient Detail Modal SSOT)
- **SSOT**: 환자 상세 모달(PatientDetailModal)의 데이터 소스는 자체 Hook(`useVitals`)의 상태를 최우선으로 사용한다.
- **외부 Prop**: 부모(Station Page)로부터 주입되는 `propVitals` 등은 초기 진입 시점에만 참조하며, 모달 열린 후에는 사용하지 않는다. 이는 부모 상태와 상관없이 모달 내 실시간성을 보장하기 위함이다.

### 2.8 Tauri IPC 창 간 통신 표준 (Window Communication)
Tauri 멀티 윈도우 환경에서 창 간 데이터 교환 시 적용하는 필수 패턴입니다.

**금지 패턴 (Re-instantiation):**
```
기존 창 close() → setTimeout(200ms) → new WebviewWindow()  ← UX 지연 + Race Condition
```

**표준 패턴 (IPC Event):**
```
창 존재 확인 → emit('event-name', payload) → focusWindow()  ← 즉시 + Race-free
창 없을 시   → getOrCreate()로 최초 생성만
수신 측      → listen('event-name', handler) → React 상태 갱신 → 자동 리렌더
```

**구현 표준:**
- 모든 Tauri 창 관리는 `src/utils/tauriWindowManager.ts`의 `WindowManager`를 통해서만 수행한다.
  - `getOrCreate(label, url, options)` — 없으면 생성, 있으면 show/focus만
  - `sendEvent(event, payload)` — emit() 래퍼 (전역 브로드캐스트)
  - `focusWindow(label)` — show + setFocus
- 수신 측 컴포넌트는 `listen()` 구독으로 `ipcToken` 상태를 갱신하며, `ipcToken ?? urlToken` 패턴으로 URL 파라미터를 오버라이드한다.
- `capabilities/default.json`에 `core:event:default` 권한 필수 (emit, listen, unlisten, emit-to 4개 포함).

### 2.9 TypeScript/Frontend 코드 품질 표준
프론트엔드 파일 수정 시 반드시 준수해야 하는 코드 품질 규칙이다.

- **Domain Type SSOT (역방향 의존성 금지)**: 도메인 타입은 `frontend/src/types/domain.ts`를 SSOT로 유지한다. 훅(`hooks/`)이 컴포넌트(`components/`)에서 타입을 import하는 구조(역방향 의존성)는 금지하며, 공용 타입은 반드시 `domain.ts`로 승격한 뒤 양쪽에서 import한다.
- **TS6133 Catch Block Hygiene**: `catch` 블록에서 에러 객체를 사용하지 않는 경우 반드시 `catch { }` (변수 없음) 패턴을 사용한다. `catch (e) { }` 선언 후 미사용은 **빌드 파이프라인을 중단**시키는 치명적 실수다.
  - `Bad`: `catch (e) { console.error("실패"); }` → TS6133 유발
  - `Good`: `catch { console.error("실패"); }` — 현대적 방식
- **Import 보존 Zero-Tolerance**: 미사용처럼 보이는 `import` 구문을 자의적으로 삭제 금지. 삭제 전 `Select-String -Recurse`로 프로젝트 전체 사용처를 **기술적으로 증명**해야 한다.
- **Self-Audit Workflow**: TS 파일 수정 직후 반드시 아래 명령으로 타입 오류를 확인한다.
  ```powershell
  npx tsc --noEmit --skipLibCheck
  ```
- **Surgical Edit (외과적 정밀 수정)**: 수정 범위를 필요 최소한으로 제한하며, 기존 `import` 구문·코드 스타일·포매팅을 완벽히 보존한다.
- **Rollback-First 전략**: 에러 발생 시 코드를 덧대어 해결하려 하지 않는다. 즉시 `git checkout`으로 롤백한 뒤 설계 단계부터 재검토한다.
- **UI Input Safety**: 모든 수치(체온, 수액 속도, 약물량 등) 입력 필드(`type="number"`)에서는 브라우저 기본 및 커스텀 증감 버튼(Spin Buttons/Arrows) 사용을 금지한다. 이는 정밀한 의료 데이터 수동 입력 시 의도치 않은 수치 변경(휠 스크롤, 클릭 실수)을 방지하기 위함이며, CSS `[appearance:textfield]` 스타일을 통해 이를 강제한다.

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

> **[Phase 4-A Tasks 1~5 전체 완료 — 2026-03-12]**: `pyproject.toml` 그룹 분리, Core-only 기동 검증, 라우터 OpenAPI 메타데이터 전수 명시, Pydantic v2 전환(`.model_dump()`), ruff 0 + mypy 0 달성.

- **확정 구조 (uv `[dependency-groups]`)**:
  - `[project].dependencies` → **Core 50개**: fastapi, uvicorn, pydantic, supabase 스택, loguru, httpx, realtime 등 서버 실행 필수
  - `[dependency-groups].dev` → **Dev 18개**: pytest, pytest-cov, mypy, pylint, isort, watchdog, types-* 스텁, **ruff** (Phase 4-A에서 추가)
  - `[dependency-groups].tools` → **Tools 93개**: selenium, playwright, flet, google-generativeai, pandas, pyinstaller 등
- **Core-only 실행**: `uv run --no-group tools --no-group dev uvicorn main:app` ← ImportError 0개 검증 완료
- **Tools 스크립트 실행**: `uv run --group tools python scripts/xxx.py`
- **제거 확정**: `annotated-doc`, `strenum` — 전체 grep 결과 직접 import 없음
- **pyiceberg 빌드 주의**: Tools 그룹으로 이동 완료. Core-only 환경에서는 C++ 빌드 경로(pyiceberg → pyroaring) 차단됨.
- **빌드 환경 미구성 시(Legacy)**: Visual Studio Build Tools + Windows SDK(UCRT) 설치 후 `vcvars64.bat`으로 INCLUDE/LIB 경로 주입. `scripts/Refresh-BuildEnv.ps1`으로 영구 등록 가능.

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
- **표준 단위**: 병원 현장 표준에 따라 모든 수액 주입 속도는 cc/hr 단위를 사용한다. 단, **급속 수액 요법(Rapid)**은 주입 속도가 아닌 총 용량(**CC**)을 기준으로 처방한다.
- **처방 위계 (Hierarchy)**: 'Base Fluid(메인 수액)'와 'Mixed Meds(부가 약물)'를 분리 관리하며, 메인 수액은 처방의 대제목으로 기능한다.
- **약물 투여 규칙**: 항생제는 용량(**mg**) 단위를 기본으로 하며, 필요한 경우 투여 빈도(**QD, BID, TID**)를 명시한다. 기타 일반 약물은 앰플(**amp**) 단위를 사용한다.
- **하이브리드 입력 (Hybrid UX)**: 혼합 약물은 드롭다운(Select)과 직접 입력(Input)이 결합된 하이브리드 방식으로 입력하며, 긴 약물 이름으로 인한 레이아웃 깨짐 방지를 위해 `min-w-0` 및 `flex-shrink-0` 설계를 준수한다.
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

*본 문서는 프로젝트의 헌법과 같습니다. 에이전트는 모든 Action 전 본 문서를 참조하십시오.*
