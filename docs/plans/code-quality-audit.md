# 🗺️ Project Blueprint: 전체 코드 품질 감사 (AI_GUIDELINES 준수 검증)

> 생성 일시: 2026-03-16 | 상태: 진행 중

## 🎯 Architectural Goal

`AI_GUIDELINES.md`에 정의된 아키텍처 원칙 및 코딩 수칙 준수 여부를 프로젝트 전체 파일을 대상으로 **1파일 1검증** 방식으로 체계적으로 감사한다.

**SSOT 정렬**: `docs/CRITICAL_LOGIC.md` 및 `docs/memory.md`와 연계하여 감사 결과를 기록한다.

---

## 📋 검증 체크리스트 (AI_GUIDELINES.md 기준)

각 파일 검증 시 아래 항목을 순서대로 점검한다.

| # | 항목 | 기준 섹션 | TypeScript 적용 | PowerShell 적용 | Python 적용 |
|---|------|-----------|-----------------|-----------------|-------------|
| A | 한국어 주석/문서화 | §0 | ✅ | ✅ | ✅ |
| B | 파일 300라인 미만 | §1 | ✅ | ✅ | ✅ |
| C | `any` 타입 금지 | §4, §5 | ✅ | - | - |
| D | 명시적 Interface + Type Guard | §4 | ✅ | - | - |
| E | Early Return (depth ≤ 2) | §5 | ✅ | ✅ | ✅ |
| F | Error Handling (Try/Catch/Finally) | §5 | ✅ | ✅ | ✅ |
| G | SSOT (중복 데이터 저장 금지) | §4 | ✅ | ✅ | ✅ |
| H | PowerShell $true/$false 문법 | §5 | - | ✅ | - |
| I | Test-Path / Null 체크 선행 | §5 | - | ✅ | - |
| J | config/paths.ps1 Dot-sourcing (하드코딩 금지) | §6 | - | ✅ | - |
| K | 민감 정보 환경 변수 처리 | §7 | ✅ | ✅ | ✅ |
| L | 3-Layer Architecture 준수 | §4 | ✅ | - | - |
| M | 명령어 체이닝 금지 (PS) | §2 | - | ✅ | - |

---

## 🛠️ Step-by-Step Execution Plan

> ⚠️ **각 Task는 단 하나의 Read Tool Call로 완료되어야 한다.**
> 검증 후 이슈 발견 시 별도 fix 태스크를 생성하여 처리한다.

### 📦 Phase 1: PowerShell 스크립트 (인프라 레이어)

> 항목 B,E,F,G,H,I,J,M 중점 점검

- [x] **PS-1: `scripts/Start-Frontend.ps1` 읽기 및 검증** — ✅ 완료
  - **체크포인트**: 300라인 미만 / Try-Catch / `$true`·`$false` / Test-Path / 체이닝 금지 / Dot-sourcing
  - **결과**: F 위반(Try-Catch 없음), J 위반(`.cargo\bin` 하드코딩) → **Critical**

- [x] **PS-2: `scripts/Start-Backend.ps1` 읽기 및 검증** — ✅ 완료
  - **결과**: F 위반(Try-Catch 없음), I 위반(Set-Location 전 Test-Path 없음) → **Critical**

- [x] **PS-3: `scripts/Setup-Environment.ps1` 읽기 및 검증** — ✅ 완료
  - **결과**: J 위반(SDK 경로·doctor.py 경로 하드코딩) → **Warning**

- [x] **PS-4: `scripts/Fix-BatEncoding.ps1` 읽기 및 검증** — ✅ 완료
  - **결과**: F 위반(파일 쓰기 Try-Catch 없음), J 위반(파일명 하드코딩) → **Critical**

- [x] **PS-5: `scripts/Get-SdkVersion.ps1` 읽기 및 검증** — ✅ 완료
  - **결과**: F 경계(SilentlyContinue로 오류 은폐), J 위반(SDK 경로 하드코딩) → **Warning**

- [x] **PS-6: `scripts/Invoke-DocsRefactor.ps1` 읽기 및 검증** — ✅ 완료
  - **결과**: F 위반(파괴적 작업 Try-Catch 없음), G 위반(SSOT 중복 — Verify-DocsLinks.ps1과 배열 중복), J 위반 → **Critical**

- [x] **PS-7: `scripts/Invoke-Repomix.ps1` 읽기 및 검증** — ✅ 완료
  - **결과**: F 경계(Catch 없는 Try-Finally), J 위반(include 경로 하드코딩) → **Warning**

- [x] **PS-8: `scripts/launch_wt_dev.ps1` 읽기 및 검증** — ✅ 완료
  - **결과**: J 경미(엔진명 하드코딩 — 수용 수준) → **Warning**

- [x] **PS-9: `scripts/Optimize-Network.ps1` 읽기 및 검증** — ✅ 완료
  - **결과**: E 경미(else 분기 사용) → **Pass**

- [x] **PS-10: `scripts/Save-EcoBatAscii.ps1` 읽기 및 검증** — ✅ 완료
  - **결과**: F 위반(파일 I/O Try-Catch 없음), I 위반(Test-Path 없음), J 위반 → **Critical**

- [x] **PS-11: `scripts/Verify-DocsLinks.ps1` 읽기 및 검증** — ✅ 완료
  - **결과**: F 위반(Set-Content Try-Catch 없음), G 위반(SSOT 중복 — Invoke-DocsRefactor.ps1과 배열 중복), I 부분 위반, J 위반 → **Critical**

---

### 📦 Phase 2: 타입 정의 & 서비스 레이어 (TypeScript)

> 항목 A,B,C,D,F,G,K,L 중점 점검

- [x] **TS-1: `frontend/src/types/domain.ts` 읽기 및 검증** — ✅ 완료
  - **체크포인트**: `any` 금지 / Interface 명시 / Type Guard / SSOT
  - **결과**: A 위반(한국어 주석 전무 — 비즈니스 도메인 인터페이스에 한국어 JSDoc 부재) → **Warning**

- [x] **TS-2: `frontend/src/lib/api.ts` 읽기 및 검증** — ✅ 완료
  - **체크포인트**: `any` 금지 / Error Handling / 민감 정보 환경 변수
  - **결과**: C 위반(`cachedTauriFetch: any`, `cachedTauriLog: any`, `catch (err: any)` 3건), A 경미(한국어·영어 주석 혼용) → **Critical**

- [x] **TS-3: `frontend/src/services/IVLabelService.ts` 읽기 및 검증** — ✅ 완료
  - **체크포인트**: 3-Layer 준수 (Service 계층) / Early Return / Error Handling
  - **결과**: G 위반(`generatePreview`/`printLabel` invoke 파라미터 빌드 로직 완전 중복 — private helper 미추출), F 경계(catch 후 re-throw만 수행 — 에러 컨텍스트 미보강) → **Warning**

- [x] **TS-4: `frontend/src/constants/mappings.ts` 읽기 및 검증** — ✅ 완료
  - **체크포인트**: SSOT (중복 상수 금지) / `any` 금지
  - **결과**: A 경미(line 6에 영어 잔재 to-do 주석, `MEAL_MAP`·`ROOM_NUMBERS`에 한국어 JSDoc 없음) → **Warning**

---

### 📦 Phase 3: Hooks (Repository 레이어)

> 항목 A,B,C,D,E,F,G 중점 점검

- [x] **HK-1: `frontend/src/hooks/useDashboardData.ts` 읽기 및 검증** — ✅ 완료
  - **결과**: G 경미(동일 queryKey 이중 `useQuery` 패턴 — error 분리 목적이나 중복 구독 설계), F 경계(queryFn 내 try-catch 부재, React Query 위임) → **Warning**

- [x] **HK-2: `frontend/src/hooks/useDashboardStats.ts` 읽기 및 검증** — ✅ 완료
  - **결과**: C 위반(`window as any`), G **Critical**(line 71-78 `allDocItems`/`requestedDocItems` 완전 동일 로직 중복), A 경미(영어 주석 혼용), D 경미(반환 타입 Interface 미정의), F 경계(`catch(_) {}` 에러 무시) → **Critical**

- [x] **HK-3: `frontend/src/hooks/useMeals.ts` 읽기 및 검증** — ✅ 완료
  - **결과**: A 경미(영어 주석 혼용 — line 5, 39), F 경계(`savePlans` catch 후 re-throw만 수행) → **Pass**

- [x] **HK-4: `frontend/src/hooks/usePatientActions.ts` 읽기 및 검증** — ✅ 완료
  - **결과**: F **Critical**(`apiAddExam`·`apiMealUpdate` try-catch 완전 부재, `apiDeleteExam` catch 없는 try-finally), A 경미(함수 단위 JSDoc 전무) → **Critical**

- [x] **HK-5: `frontend/src/hooks/useStation.ts` 읽기 및 검증** — ✅ 완료
  - **결과**: B 경계(297라인 — 3라인 여유), G 경미(`mealTimeMap` 로컬 하드코딩 — `constants/mappings`로 이전 필요), F 경계(queryFn try-catch 부재) → **Warning**

- [x] **HK-6: `frontend/src/hooks/useStationActions.ts` 읽기 및 검증** — ✅ 완료
  - **결과**: A 경미(함수 단위 JSDoc 전무), C 경미(일부 `catch (e)` 타입 미명시 — 불일관) → **Pass**

- [x] **HK-7: `frontend/src/hooks/useStationDashboard.ts` 읽기 및 검증** — ✅ 완료
  - **결과**: A 경미(영어 로그 메시지 혼용) → **Pass**

- [x] **HK-8: `frontend/src/hooks/useVitals.ts` 읽기 및 검증** — ✅ 완료
  - **결과**: B **Critical**(384라인 — 300라인 초과, 모듈 분리 필수), G **Critical**(line 197-221 `NEW_MEAL_REQUEST`/`MEAL_UPDATED` case 완전 동일 로직 중복) → **Critical**

- [x] **HK-9: `frontend/src/hooks/useWebSocket.ts` 읽기 및 검증** — ✅ 완료
  - **결과**: 전 항목 준수 → **Pass** ✅

---

### 📦 Phase 4: 컴포넌트 (UI 레이어)

> 항목 A,B,C,E,G 중점 점검 (Pure Presenter 원칙)

- [x] **UI-1: `frontend/src/components/PatientCard.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: A 경미(memo comparator 내 영어 주석 6줄 — lines 95~116) → **Pass**
- [x] **UI-2: `frontend/src/components/PatientDetailModal.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: C 경미(lines 149·158 `catch(err)` 타입 미명시 — `unknown` 필요), A 경미(함수 JSDoc 전무) → **Pass**
- [x] **UI-3: `frontend/src/components/IVUploadForm.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: L 위반(line 57 `fetch` 직접 호출 — `api.ts` 우회), A 경미(영어 JSX 주석 9건), C 경미(`catch(e)` 타입 미명시) → **Warning**
- [x] **UI-4: `frontend/src/components/IVLabelPreviewModal.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: B **Critical**(307라인 — 300라인 초과, `LabResultsSection`·`PatientInfoSection` 분리 필요), C **Critical**(line 222 `as any` — `'NONE' | 'NEG' | 'POS'` 리터럴 캐스팅 필요), A 경미(영어 주석 혼용, JSDoc 전무) → **Critical**
- [x] **UI-5: `frontend/src/components/IVLabelPreviewSection.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: A 경미(JSX 주석 영어 혼용 2건 — line 68·185, Interface JSDoc 전무) → **Pass**
- [x] **UI-6: `frontend/src/components/IVLabelMedSection.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: G **Critical**(①MixedMed↔MixedMedForPreview 타입 완전 중복 — types/domain.ts 단일화 필요, ②showRate 양 브랜치 med 렌더링 로직 90% 중복 — MedItemRow 추출 필요), A 위반(Interface·함수 JSDoc 전무, 영어 UI 레이블 혼용) → **Critical**
- [x] **UI-7: `frontend/src/components/IVStatusCard.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: G 경미(`cn` 헬퍼 4개 파일 중복 정의 — IVStatusCard/MealRequestModal/TemperatureGraph/DocumentRequestModal), A 경미(Interface JSDoc 전무) → **Warning**
- [x] **UI-8: `frontend/src/components/MealGrid.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: L 위반(`api.get`·`api.post` 컴포넌트 내부 직접 호출 — Hook 분리 필요), A 경미(영어 주석 다수) → **Warning**
- [x] **UI-9: `frontend/src/components/MealRequestModal.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: G **Critical**(PEDIATRIC_OPTIONS·GUARDIAN_OPTIONS 로컬 재정의 — mealGridUtils.ts와 중복), L **Critical**(line 115 `fetch()` 직접 호출 + `process.env` 직접 참조 — api.ts 우회), A 경미 → **Critical**
- [x] **UI-10: `frontend/src/components/EditMealModal.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: G 위반(PEDIATRIC_OPTIONS·GUARDIAN_OPTIONS 로컬 상수 재정의 — mealGridUtils/MealRequestModal과 3중 중복), A 경미(JSDoc 전무) → **Warning**
- [x] **UI-11: `frontend/src/components/VitalModal.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: A 경미(영어 주석 1건, JSDoc 전무) → **Pass**
- [x] **UI-12: `frontend/src/components/TemperatureGraph.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: B **Critical**(304라인 초과 — 300라인 기준 위반), C **Critical**(line 148 `payload as any` — 명시적 타입 캐스팅 필요), A 경미(영어 JSX 주석 다수) → **Critical**
- [x] **UI-13: `frontend/src/components/TransferModal.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: A 경미(JSDoc 전무) → **Pass**
- [x] **UI-14: `frontend/src/components/DocumentRequestModal.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: L 위반(line 54 `fetch()` 직접 호출 + `process.env` 직접 참조 — MealRequestModal과 동일 패턴), A 경미(영어 주석·JSDoc 전무) → **Warning**
- [x] **UI-15: `frontend/src/components/QrCodeModal.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: C 위반(line 33 `window as any` — useDashboardStats와 동일 패턴, `unknown` + Type Guard 대체 필요), A 경미(영어 주석 혼용) → **Warning**
- [x] **UI-16: `frontend/src/components/NotificationItem.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: 전 항목 준수 → **Pass** ✅
- [x] **UI-17: `frontend/src/components/mealGridUtils.ts` 읽기 및 검증** — ✅ 완료
  - **결과**: 전 항목 준수 (SSOT 출처 역할 충실) → **Pass** ✅
- [x] **UI-18: `frontend/src/components/temperatureChartUtils.ts` 읽기 및 검증** — ✅ 완료
  - **결과**: A 경미(JSDoc 일부 영어 혼용) → **Pass**
- [x] **UI-19: `frontend/src/contexts/StationContext.tsx` 읽기 및 검증** — ✅ 완료
  - **결과**: 전 항목 준수 (한국어 주석·Interface·Early Return 완비) → **Pass** ✅
- [x] **UI-20: `frontend/src/utils/dateUtils.ts` 읽기 및 검증** — ✅ 완료
  - **결과**: A 경미(파일 상단 영어 블록 주석 다수) → **Pass**
- [x] **UI-21: `frontend/src/utils/tauriWindowManager.ts` 읽기 및 검증** — ✅ 완료
  - **결과**: 전 항목 준수 (한국어 JSDoc·`unknown` 타입 사용·Early Return 완비) → **Pass** ✅

---

### 📦 Phase 5: Python 스크립트

> 항목 A,B,E,F,K 중점 점검

- [x] **PY-1: `scripts/check_encoding.py` 읽기 및 검증** — ✅ 완료
  - **결과**: F **Critical**(파일 읽기 try/except 전무), A(주석 전무), 절대경로 하드코딩 → **Critical**

- [x] **PY-2: `scripts/doctor.py` 읽기 및 검증** — ✅ 완료
  - **결과**: A 경미(check_uv만 한국어 docstring, 나머지 6개 함수 영어 주석) → **Warning**

- [x] **PY-3: `scripts/security_check.py` 읽기 및 검증** — ✅ 완료
  - **결과**: E 위반(`check_debug_code` while→for→if→try→for 5단계 중첩 — Early Return 분리 필요), A 경미(함수 docstring 전무) → **Warning**

- [x] **PY-4: `scripts/save_bat_cp949.py` 읽기 및 검증** — ✅ 완료
  - **결과**: F **Critical**(파일 쓰기 try/except 전무), 절대경로 하드코딩(`r"c:\develop\eco_pediatrics\eco.bat"`) → **Critical**

---

### 📦 Phase 6: 문서 (Markdown)

> 항목 A, §12 마크다운 수칙 중점 점검

- [x] **DOC-1: `docs/memory.md` 읽기 및 검증** — ✅ 완료
  - **결과**: A 경미(`[Context]`/`[Action]`/`[Status]` 태그 영어 사용 — 기능적 구분자이므로 수용 가능), 177줄(200줄 미달 — 즉시 요약 불필요), 구조·가독성 양호 → **Pass**

- [x] **DOC-2: `README.md` 읽기 및 검증** — ✅ 완료
  - **결과**: §12 유지보수 위반(`Last updated: 2026-03-12` 고정 — Phase 2~4 UI Fix 완료/Code Quality Audit 진행 중 등 2026-03-16 변경사항 미반영), A 경미(기술 스택 영어 고유명사는 허용 수준) → **Warning**

- [x] **DOC-3: `CLAUDE.md` 읽기 및 검증** — ✅ 완료
  - **결과**: G 경미(`CLAUDE.md` ↔ `AI_GUIDELINES.md` 내용 완전 동일 — §6에서 `AI_GUIDELINES.md` 상속 명시에도 불구 내용 중복 복사됨, AI 에이전트 설정 목적상 수용 가능), A·헤더·백틱 전 항목 준수 → **Warning**

---

## 📊 감사 결과 누적 레코드

### Phase 1 완료 (2026-03-16)

| 파일 | 라인 수 | 위반 항목 | 심각도 | 조치 여부 |
|------|---------|-----------|--------|-----------|
| `Start-Frontend.ps1` | 32 | F(Try-Catch 없음), J(`.cargo\bin` 하드코딩) | **Critical** | ✅ F 조치완료(FIX-6) / ✅ J 조치완료(Phase C: `$script:CARGO_BIN_SUBPATH`) |
| `Start-Backend.ps1` | 17 | F(Try-Catch 없음), I(Test-Path 없음) | **Critical** | ✅ 조치완료(FIX-2) |
| `Setup-Environment.ps1` | 140 | J(SDK 경로·`doctor.py` 경로 하드코딩) | Warning | ✅ 조치완료 (Phase C: `$script:SDK_KITS_SUBPATH` Dot-sourcing) |
| `Fix-BatEncoding.ps1` | 27 | F(파일 쓰기 Try-Catch 없음), J(파일명 하드코딩) | **Critical** | ✅ F 조치완료(FIX-3) / ✅ J 조치완료(Phase C: `$script:ECO_BAT_FILES`) |
| `Get-SdkVersion.ps1` | 15 | F(SilentlyContinue 오류 은폐), J(SDK 경로 하드코딩) | Warning | ✅ 조치완료 (Phase C: `$script:SDK_KITS_SUBPATH` Dot-sourcing) |
| `Invoke-DocsRefactor.ps1` | 73 | F(파괴적 작업 Try-Catch 없음), G(SSOT 중복), J(경로 하드코딩) | **Critical** | ✅ F·G 조치완료(FIX-4, FIX-7) / ✅ J 조치완료(Phase C: `$script:DOCS_ROOT_REL`) |
| `Invoke-Repomix.ps1` | 32 | F(Catch 없는 Try-Finally), J(include 경로 하드코딩) | Warning | ✅ 조치완료 (Phase C: `$script:REPOMIX_INCLUDE`/`$script:REPOMIX_IGNORE` Dot-sourcing) |
| `launch_wt_dev.ps1` | 77 | J(엔진명 하드코딩 — 경미) | Warning | ✅ 조치완료 (Phase C: `$script:PS_ENGINE_PRIMARY`/`$script:PS_ENGINE_FALLBACK`) |
| `Optimize-Network.ps1` | 17 | E(else 분기 사용 — 경미) | Pass | — |
| `Save-EcoBatAscii.ps1` | 10 | F(파일 I/O Try-Catch 없음), I(Test-Path 없음), J(파일명 하드코딩) | **Critical** | ✅ F·I 조치완료(FIX-1) / ✅ J 조치완료(Phase C: `$script:ECO_BAT_NAME`) |
| `Verify-DocsLinks.ps1` | 105 | F(Set-Content Try-Catch 없음), G(SSOT 중복), I(부분 미체크), J(경로 하드코딩) | **Critical** | ✅ F·G·I 조치완료(FIX-5, FIX-7) / ✅ J 조치완료(Phase C: `$script:DOCS_ROOT_REL`/`$script:DOCS_ARCHIVE_REL`) |

### Phase 2 완료 (2026-03-16)

| 파일 | 라인 수 | 위반 항목 | 심각도 | 조치 여부 |
|------|---------|-----------|--------|-----------|
| `types/domain.ts` | 130 | A(한국어 JSDoc 전무) | Warning | ✅ 조치완료 (FIX-F: 핵심 인터페이스 한국어 JSDoc 추가) |
| `lib/api.ts` | 234 | C(`any` 3건: `cachedTauriFetch`, `cachedTauriLog`, `catch err`), A(주석 혼용) | **Critical** | ✅ 조치완료 (FIX-A·B: `TauriFetchFn`/`TauriLogFns` 명시, FIX-C: `catch unknown`) |
| `services/IVLabelService.ts` | 92 | G(invoke 파라미터 빌드 로직 중복 — private helper 미추출), F(catch→re-throw만) | Warning | ✅ 조치완료 (FIX-D: `buildInvokeParams()` SSOT 추출) |
| `constants/mappings.ts` | 38 | A(영어 잔재 주석 line 6, 일부 한국어 JSDoc 없음) | Warning | ✅ 조치완료 (FIX-E: 영어 잔재 제거·한국어 JSDoc 추가) |

### Phase 3 완료 (2026-03-16)

| 파일 | 라인 수 | 위반 항목 | 심각도 | 조치 여부 |
|------|---------|-----------|--------|-----------|
| `hooks/useDashboardData.ts` | 109 | G 경미(이중 `useQuery` 구독 패턴), F 경계 | Warning | ⏳ 미조치 |
| `hooks/useDashboardStats.ts` | 103 | C(`window as any`), G(allDocItems·requestedDocItems 완전 중복), A 경미, D 경미, F 경계 | **Critical** | ✅ 조치완료 (FIX-HK-2: Type Guard 적용, FIX-HK-3: `nonCanceledDocItems` SSOT 통합) |
| `hooks/useMeals.ts` | 55 | A 경미(영어 주석 혼용), F 경계(re-throw만) | Pass | — |
| `hooks/usePatientActions.ts` | 121 | F(apiAddExam·apiMealUpdate try-catch 완전 부재, apiDeleteExam catch 없음) | **Critical** | ✅ 조치완료 (FIX-HK-1: 3개 함수 try-catch + `e: unknown` 가드 추가) |
| `hooks/useStation.ts` | 297 | B 경계(297라인), G 경미(mealTimeMap 내부 하드코딩), F 경계 | Warning | ⏳ 미조치 |
| `hooks/useStationActions.ts` | 134 | A 경미(JSDoc 전무), C 경미(catch 타입 불일관) | Pass | — |
| `hooks/useStationDashboard.ts` | 69 | A 경미(영어 로그 혼용) | Pass | — |
| `hooks/useVitals.ts` | 384→133 | **B(384라인 초과 — 모듈 분리 필수)**, G(NEW_MEAL_REQUEST·MEAL_UPDATED 동일 로직 중복) | **Critical** | ✅ 조치완료 (FIX-HK-4: `handleMealUpdate` 헬퍼 추출, FIX-HK-5: WsHandler·Optimistic 분리) |
| `hooks/useWebSocket.ts` | 138 | 없음 | Pass ✅ | — |

### Phase 5 완료 (2026-03-16)

| 파일 | 라인 수 | 위반 항목 | 심각도 | 조치 여부 |
|------|---------|-----------|--------|-----------|
| `check_encoding.py` | 13 | F(파일 읽기 try/except 전무), A(주석 전무), 절대경로 하드코딩 | **Critical** | ✅ 조치완료 (Phase A-1: `Path(__file__).parent.parent` 상대경로, `try/except OSError`) |
| `doctor.py` | 188 | A 경미(한국어 docstring 혼용 불일관 — check_uv만 한국어) | Warning | ✅ 조치완료 (Phase B-2: 8개 함수 한국어 docstring·반환 타입 전수 추가) |
| `security_check.py` | 146 | E(check_debug_code 5단계 중첩 위반 — Early Return+헬퍼 분리 필요), A 경미(함수 docstring 전무) | Warning | ✅ 조치완료 (Phase B-1: `_scan_file_for_debug` 헬퍼 추출, 전 함수 한국어 docstring 추가) |
| `save_bat_cp949.py` | 130 | F(파일 쓰기 try/except 전무), 절대경로 하드코딩(`r"c:\develop\eco_pediatrics\eco.bat"`) | **Critical** | ✅ 조치완료 (Phase A-2: `Path(__file__).parent.parent` 상대경로, `try/except OSError + SystemExit`) |

### Phase 6 완료 (2026-03-16)

| 파일 | 라인 수 | 위반 항목 | 심각도 | 조치 여부 |
|------|---------|-----------|--------|-----------|
| `docs/memory.md` | 177 | A 경미(`[Context]`/`[Action]` 태그 영어 — 수용 가능) | Pass | — |
| `README.md` | 82 | §12 유지보수 위반(`Last updated: 2026-03-12` — Phase 2~4 완료 내용 미반영), A 경미 | Warning | ⏳ 미조치 |
| `CLAUDE.md` | 102 | G 경미(`AI_GUIDELINES.md`와 내용 완전 중복 — AI 설정 목적상 수용 가능), A·구조 전 항목 준수 | Warning | — |

### Phase 6 핵심 발견사항

**Warning 2건 요약:**

| # | 이슈 | 영향 파일 |
|---|------|-----------|
| W-DOC-1 | §12 유지보수 위반 — `Last updated`가 2026-03-12로 고정. Phase 2(TS 타입 개선), Phase 3(Hooks 수정), Phase 4(UI Fix), Code Quality Audit Phase 1~5 완료 내용 미반영 | `README.md` |
| W-DOC-2 | G 경미 — `CLAUDE.md`가 `AI_GUIDELINES.md` 내용을 완전 복사. AI 에이전트 설정 목적상 수용 가능하나 이중 유지보수 리스크 존재 | `CLAUDE.md` |

---

### Phase 5 핵심 발견사항

**Critical 2건 요약:**

| # | 이슈 | 영향 파일 |
|---|------|-----------|
| C-9 | 파일 I/O try/except 전무 — PS 스크립트 C-1과 동일한 구조적 결함 반복 | `check_encoding.py`, `save_bat_cp949.py` |
| C-10 | 절대 경로 하드코딩 — `r"c:\develop\eco_pediatrics\..."` 패턴, `Path(__file__).parent.parent` 기준 상대 경로 대체 필요 | `check_encoding.py`, `save_bat_cp949.py` |

**Warning 공통 패턴:**

- A 경미: 함수 docstring 미작성 패턴이 Python 스크립트 전반에 산재 (`doctor.py`, `security_check.py`)
- E 위반: `security_check.py`의 `check_debug_code()` — 단일 함수 내 5단계 중첩, 파일 처리 헬퍼 함수 분리로 해소 가능

---

### Phase 4 진행 중 (2026-03-16)

| 파일 | 라인 수 | 위반 항목 | 심각도 | 조치 여부 |
|------|---------|-----------|--------|-----------|
| `components/IVLabelPreviewModal.tsx` | 307→257 | B(307라인 초과 — `IVLabelLabSection` 분리로 257라인 해소), C(`as any` → `AstResult` 리터럴 캐스팅), A 경미(영어 주석 혼용) | **Critical** | ✅ B·C 조치완료 / A 미조치 |
| `components/IVLabelMedSection.tsx` | 276→241 | G **Critical**(MixedMed↔MixedMedForPreview 타입 중복, showRate 양 브랜치 렌더링 로직 중복 — MedItemRow 추출 필요), A 위반(JSDoc 전무, 영어 레이블 혼용) | **Critical** | ✅ 조치완료 (C-11-G1: `MixedMed` domain.ts 단일화, C-11-G2: `MedItemRow` 추출) |
| `components/IVLabelPreviewSection.tsx` | 194 | A 경미(JSX 주석 영어 혼용 2건 — line 68·185, Interface JSDoc 전무) | Pass | — |
| `components/IVStatusCard.tsx` | 57 | G 경미(`cn` 헬퍼 4파일 중복 정의), A 경미(JSDoc 전무) | Warning | ⏳ 미조치 |
| `components/MealGrid.tsx` | 285 | L 위반(api.get·api.post 컴포넌트 내 직접 호출 — Hook 분리 필요), A 경미 | Warning | ⏳ 미조치 |
| `components/MealRequestModal.tsx` | 265 | G **Critical**(PEDIATRIC/GUARDIAN OPTIONS 로컬 재정의 — mealGridUtils 중복), L **Critical**(fetch 직접 호출·api.ts 우회), A 경미 | **Critical** | ✅ 조치완료 (W-2: `mealGridUtils` 파생 상수 교체, C-10: `api.post()` 전환) |
| `components/EditMealModal.tsx` | 137 | G 위반(PEDIATRIC/GUARDIAN OPTIONS 3중 중복 — mealGridUtils·MealRequestModal), A 경미 | Warning | ⏳ 미조치 |
| `components/VitalModal.tsx` | 91 | A 경미(영어 주석 1건, JSDoc 전무) | Pass | — |
| `components/TemperatureGraph.tsx` | 304→267 | B **Critical**(304라인 초과), C **Critical**(line 148 `payload as any`), A 경미 | **Critical** | ✅ 조치완료 (C-9: 타입 캐스팅 명시, `temperatureChartUtils.ts` 분리로 267라인) |
| `components/TransferModal.tsx` | 106 | A 경미(JSDoc 전무) | Pass | — |
| `components/DocumentRequestModal.tsx` | 163 | L 위반(fetch 직접 호출·api.ts 우회 — MealRequestModal 동일 패턴), A 경미 | Warning | ⏳ 미조치 |
| `components/QrCodeModal.tsx` | 111 | C 위반(line 33 `window as any` — unknown+Type Guard 대체 필요), A 경미 | Warning | ⏳ 미조치 |
| `components/NotificationItem.tsx` | 30 | 없음 | Pass ✅ | — |
| `components/mealGridUtils.ts` | 41 | 없음 | Pass ✅ | — |
| `components/temperatureChartUtils.ts` | 120 | A 경미(JSDoc 영어 혼용) | Pass | — |
| `contexts/StationContext.tsx` | 67 | 없음 | Pass ✅ | — |
| `utils/dateUtils.ts` | 135 | A 경미(파일 상단 영어 블록 주석 다수) | Pass | — |
| `utils/tauriWindowManager.ts` | 58 | 없음 | Pass ✅ | — |

---

### Phase 3 핵심 발견사항

**Critical 4건 요약:**

| # | 이슈 | 영향 파일 |
|---|------|-----------|
| C-5 | `window as any` 사용 — Tauri 감지를 위한 런타임 타입 우회 (`unknown` + Type Guard 대체 필요) | `useDashboardStats.ts` |
| C-6 | `apiAddExam`·`apiMealUpdate` try-catch 완전 부재 — 서버 오류 시 UI 상태 불일치 위험 | `usePatientActions.ts` |
| C-7 | 384라인 — 300라인 초과, §1 모듈화 기준 위반 (WS 핸들러·Optimistic 헬퍼 분리 필요) | `useVitals.ts` |
| C-8 | G 위반 — `allDocItems`/`requestedDocItems` 완전 동일 코드, `NEW_MEAL_REQUEST`/`MEAL_UPDATED` case 중복 | `useDashboardStats.ts`, `useVitals.ts` |

**Warning 공통 패턴:**

- F 경계: React Query `queryFn` 내 try-catch를 React Query에 위임하는 패턴 — 의도적이나 에러 컨텍스트 보강 미흡
- A 경미: 함수 단위 JSDoc 미작성 패턴이 대부분 Hook에 산재

---

### Phase 2 핵심 발견사항

**Critical 1건 요약:**

| # | 이슈 | 영향 파일 |
|---|------|-----------|
| C-4 | `any` 타입 3곳 사용 — `cachedTauriFetch`, `cachedTauriLog` 캐시 변수 및 catch 블록에서 `unknown` 미사용 | `lib/api.ts` |

**Warning 공통 패턴:**

- A 위반: 한국어 JSDoc 미작성이 타입 정의·상수 파일 전반에 공통으로 존재
- G 위반: `IVLabelService`의 `generatePreview`/`printLabel`이 동일한 invoke 파라미터 빌드 로직을 중복 보유 — private `buildInvokeParams()` helper 추출 필요

---

### Phase 1 핵심 발견사항

**Critical 5건 요약:**

| # | 이슈 | 영향 스크립트 |
|---|------|---------------|
| C-1 | Try-Catch 전무 — 파괴적 파일 I/O 실패 시 원본 손상 위험 | `Fix-BatEncoding`, `Save-EcoBatAscii`, `Invoke-DocsRefactor`, `Verify-DocsLinks`, `Start-Frontend`, `Start-Backend` |
| C-2 | Test-Path 누락 — 파일 미존재 시 즉시 예외 발생 | `Save-EcoBatAscii`, `Start-Backend` |
| C-3 | SSOT 위반 — `$filesToArchive` / `$archivedNames` 배열 완전 중복 | `Invoke-DocsRefactor`, `Verify-DocsLinks` |

**Warning 공통 패턴:**

- `config/paths.ps1` Dot-sourcing 미도입 — 경로 하드코딩이 모든 스크립트에 산재
- SDK 경로(`${env:ProgramFiles(x86)}\Windows Kits\10\...`)가 최소 2개 파일에 독립적으로 존재

---

## ⚠️ 기술적 제약 및 규칙

- **1파일 = 1응답**: 파일 하나를 읽고 검증 결과를 보고한 뒤 반드시 사용자 승인 대기
- **컨텍스트 관리**: 300라인 이상 파일은 분할 읽기(`offset`, `limit`) 활용
- **Encoding**: 모든 검증 메모는 UTF-8 no BOM으로 기록
- **Fix 범위**: 발견된 이슈는 이 플랜 문서에 기록 후 별도 fix 세션에서 처리

## ✅ Definition of Done

1. [x] Phase 1~6의 전체 파일 검증 완료
2. [x] 감사 결과 레코드 테이블 완성
3. [x] 위반 사항 심각도 분류 (Critical / Warning / Info)
4. [x] `memory.md`에 감사 결과 요약 반영
5. [ ] 필요 시 `fix` 플랜 문서 별도 생성
