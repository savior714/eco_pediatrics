# Memory (Append-Only)

## Executive Summary
- **remaining-fixes-plan Phase D 완료 (2026-03-16)**: `code-quality-audit.md` 감사 테이블 전수 최신화. Phase 1 J위반 9건(Phase C 완료 기준), Phase 2 4건, Phase 3 3건(useDashboardStats/usePatientActions/useVitals), Phase 4 3건(TemperatureGraph/MealRequestModal/IVLabelMedSection), Phase 5 4건(Python, Phase A·B 완료 기준) 전부 ✅ 조치완료 반영. `remaining-fixes-plan.md` DoD 달성.
본 문서는 `Antigravity IDE Agent`의 연속성 보존을 위한 실시간 메모리 로그입니다.
- **Code Quality Audit Phase 6 완료 (2026-03-16)**: `docs/memory.md`(Pass), `README.md`(Warning: Last updated 고정 → 즉시 최신화 조치), `CLAUDE.md`(Warning: `AI_GUIDELINES.md`와 내용 중복 — 수용). Phase 1~6 전체 감사 DoD 1~3 달성. `README.md` Last updated 최신화 완료.
- **Phase 4 UI Fix 전체 완료 (2026-03-16)**: `docs/plans/ui-fix-plan.md` 8항목(C-9/C-10/C-11·W-1~W-5) DoD 달성. `lib/utils.ts` 신규(cn SSOT), `hooks/useMealGrid.ts` 신규(MealGrid 훅 분리), `MixedMed` domain.ts 통합, `MedItemRow` 추출, fetch→api.ts 교체 2건. ReadLints 0건.
- **Phase 3 Hooks 수정 완료 (2026-03-16)**: `hooks/` 9개 파일 대상 7개 FIX 항목 전수 적용. `useVitals.ts` 384라인 → 133라인(+WsHandler 158·Optimistic 127 신규 분리). ReadLints 오류 0건.
- **Phase 2 TS 타입 품질 개선 완료 (2026-03-16)**: `lib/api.ts` any 3건 제거(`TauriFetchFn`/`TauriLogFns` 타입 명시, `catch unknown`), `IVLabelService.ts` invoke 파라미터 DRY 추출, `constants/mappings.ts` 영어 잔재 주석 제거·JSDoc 추가, `types/domain.ts` 핵심 인터페이스 한국어 JSDoc 추가. ReadLints 오류 0건.
- **Phase C PS J-Violation 해소 완료 (2026-03-16)**: `config/paths.ps1` SSOT 신규 생성(10개 전역 상수). 9개 PowerShell 스크립트(Start-Frontend/Fix-BatEncoding/Get-SdkVersion/Setup-Environment/Invoke-Repomix/launch_wt_dev/Save-EcoBatAscii/Invoke-DocsRefactor/Verify-DocsLinks) 인라인 하드코딩 → Dot-sourcing + `$script:` 상수 치환 완료. W-J-1~W-J-9 전수 해소.
- **Phase 1 Critical Fix 완료 (2026-03-16)**: PowerShell 스크립트 7개 대상 Critical 이슈(C-1 Try-Catch 전무, C-2 Test-Path 누락, C-3 SSOT 위반) 전수 수정. `Shared-DocsConstants.ps1` 신규 생성으로 중복 배열 단일화.
- **docs 통합 (2026-03-13)**: 완료된 플랜 4건 `docs/archive/plans/` 이관, VERIFICATION_DOCS_AUDIT·ERROR_MONITOR_ARCHITECTURE·LATEST_SUMMARY archive 이동, docs/README.md 갱신, Broken Links 0건.
- **300줄 리팩터 완료 (2026-03-13)**: IVLabelPreviewModal(MedSection→IVLabelMedSection), useVitals 대시보드 분리, TemperatureGraph→temperatureChartUtils, useStation→useStationDashboard, MealGrid→mealGridUtils. Task 11 ReadLints 기준 오류 0개.
- **Phase 4-A 전체 완료 (2026-03-12)**: pyproject.toml 그룹 분리(Core/Dev/Tools), Core-only 기동 검증, 라우터 OpenAPI 메타데이터 전수 명시, Pydantic v2 전환(`.model_dump()`), ruff 0 + mypy 0 달성.
- **TS 타입 오류 수정 (2026-03-10)**: `DocumentStatus`에 `CANCELED` 추가, `LucideIcon` props 타입 완화, `TemperatureGraph activeDot` 캐스팅.
- **Tauri IPC 아키텍처 전환 (2026-03-10)**: QR 미리보기 창 Re-instance → IPC emit/listen 패턴. `WindowManager` 유틸(`src/utils/tauriWindowManager.ts`) 분리.
- **Phase 2 상태관리 안정화 (2026-03-10)**: React Query 도입, WS Exponential Backoff, StationContext 격리.
- **Phase 1 타입 안전성 (2026-03-10)**: TS any 제거, pendingMutations, ErrorBoundary, toaster 전환.
- **Windows Terminal 안정화 (2026-03-06)**: PSScriptRoot Self-Location 패턴, PowerShell 7→5.1 폴백.

---

## Logs

### [2026-03-10] - TS 타입 오류 전수 수정
[Context] tsc --noEmit 실행 결과 기존 파일에서 7개 타입 오류 발견.
[Action]
- **domain.ts**: `DocumentStatus = 'PENDING' | 'FULFILLED' | 'CANCELED'` — 백엔드가 실제 사용하는 CANCELED 값 누락 수정.
- **IVLabelPreviewModal.tsx**: `MedSectionProps.icon` 타입을 `ComponentType<{size?: number}>` → `ComponentType<{size?: number | string}>` 완화. Lucide v3의 LucideProps.size가 `string | number`임을 반영.
- **TemperatureGraph.tsx**: `activeDot` 파라미터를 `(props: unknown)` + 내부 `as ChartDotProps` 캐스팅으로 교체. Recharts v2 오버로드 서명 요구 대응.
[Status] 완료. tsc --noEmit 오류 0개 확인.

### [2026-03-10] - Phase 3: Tauri IPC 아키텍처 전환 완료
[Context] QR 미리보기 창 Re-instance(close → 200ms delay → new WebviewWindow) 패턴의 UX 지연 및 Race Condition 개선.
[Action]
- **src/utils/tauriWindowManager.ts**: getOrCreate / sendEvent / focusWindow 3개 메서드로 창 관리 추상화.
- **QrCodeModal.tsx**: 창 존재 시 emit('update-preview-patient', {token}) + focusWindow(). 창 없을 시만 getOrCreate(). close/setTimeout(200ms) 로직 완전 제거.
- **useDashboardStats.ts**: listen('update-preview-patient') 구독. ipcToken state로 받아 urlToken보다 우선 적용(ipcToken ?? urlToken). cleanup 시 unlisten() 호출.
- **capabilities/default.json**: core:event:allow-emit/allow-listen → core:event:default(4개 일괄 포함)로 교체. allow-unlisten 누락 방지.
[Status] 완료
[Technical Note] Tauri emit()은 전역 브로드캐스트. emitTo()는 특정 창 타겟 가능하나 미리보기 창 1개뿐이므로 emit()으로 충분. CRITICAL_LOGIC.md 2.8절에 IPC 표준 명문화 완료.

### [2026-03-12] - Phase 4-A Task 1: 백엔드 의존성 감사 완료

[Context] `backend/pyproject.toml`의 163개 패키지가 단일 `[project].dependencies`에 혼재. 배포 이미지 경량화를 위한 core/dev/tools 버킷 분리 선행 감사.
[Action]
- 56개 .py 파일 import 스캔 (`.venv` 제외): routers/*, services/*, scripts/*, tests/
- 163개 패키지 분류 완료 → `docs/plans/phase4a-dep-audit-result.md` 생성
  - **CORE 49개**: fastapi, uvicorn, pydantic, supabase 스택, loguru, httpx, realtime, cryptography 등 전이적 의존성 포함
  - **DEV 17개**: pytest, mypy, pylint, isort, watchdog, types-* 스텁
  - **TOOLS 85개**: selenium, playwright, flet, google-generativeai, pandas, pyinstaller, qrcode, pillow 등
  - **UNKNOWN 9개**: librt, repath, annotated-doc, strenum 등 — requests/qrcode/pillow는 grep 결과 직접 import 없음 확인
- `qrcode`, `pillow`: 백엔드 전체 grep 결과 직접 import 없음 → **TOOLS 이동 결정**
- `[dependency-groups].dev`에 pytest/pytest-cov 이미 분리 — Task 2에서 중복 제거 필요
[Status] Task 1 완료.

### [2026-03-12] - Phase 4-A Task 2: pyproject.toml 그룹 분리 완료

[Context] Task 1 감사 결과 승인 후 `backend/pyproject.toml` 물리적 그룹 분리 실행.
[Action]
- `[project].dependencies` → **CORE 50개** 유지 (FastAPI 스택, Supabase, loguru, httpx 등)
- `[dependency-groups].dev` → 기존 pytest/pytest-cov 유지 + **DEV 15개** 추가 (mypy, pylint, astroid, isort, coverage, watchdog 등)
- `[dependency-groups].tools` → **신규 생성, TOOLS 93개** 이동 (selenium, playwright, flet, google-generativeai, pandas, pyinstaller 등)
- **제거 2개**: `annotated-doc==0.0.4`, `strenum==0.4.15` — 전체 grep 결과 직접 import 없음
- `uv lock` 재실행 → **158 packages resolved** (orphan 5개 자동 해소)
[Status] Task 2 완료.

### [2026-03-12] - Phase 4-A Task 3: Core-only 서버 기동 테스트 완료

[Context] tools/dev 그룹 제외 환경에서 uvicorn 기동 검증.
[Action]
- `uv run --no-group tools --no-group dev python -c "import main"` → ImportError 0개
- `uv run --no-group tools --no-group dev uvicorn main:app` → `Started server process` 확인
[Status] Task 3 완료 (PASS).

### [2026-03-12] - Phase 4-A Task 4: 라우터 response_model / status_code / summary 전수 명시 완료

[Context] 7개 라우터 파일의 모든 엔드포인트에 OpenAPI 메타데이터 누락 확인 후 일괄 적용.
[Action]
- **vitals.py**: `status_code=201`, `summary` 추가
- **meals.py**: 6개 엔드포인트 `summary` 추가
- **iv_records.py**: `status_code=201`, `summary`, 업로드 `response_model=dict` 추가
- **admissions.py**: transfer/discharge `response_model=dict` 추가, `status_code=201`, `summary` 전체
- **exams.py**: `status_code=201`, `summary`, DELETE `response_model=dict` 추가
- **station.py**: `summary` 전체, pending-requests `response_model=List[dict]`, POST `status_code=201`
- **dev.py**: `response_model=dict`, `summary` 4개 — main.py L127 DEV 가드 기존 확인
- **기존 E701 버그 수정**: station.py 단일 라인 if 문 2개 → 블록 형태 전환
- `ruff check` → `All checks passed!`, 라우터 import 검증 → OK
[Status] Task 4 완료. Task 5(Pydantic v2 model_validator 전환) 착수 가능.
- 현재 docs/memory.md 줄 수: 101/200

### [2026-03-12] - Phase 4-A Task 5: Pydantic v2 전환 + 전체 린트/타입 정리 완료

[Context] `.dict()` v1 호출 4개 → `.model_dump()` 전환. 동시에 pre-existing ruff 22개 + mypy 23개 오류 일괄 해소.
[Action]
- **`.dict()` → `.model_dump()` 전환**: `routers/vitals.py:23`, `routers/station.py:115`, `services/iv_service.py:14`, `tests/test_dashboard_contract.py:49`
- **ruff --fix (16개 자동)**: admission_service/dev_service/iv_service 미사용 import 제거, F811 중복 import 정리
- **ruff 수동 수정 (5개)**: dev_service E701/F841, meal_service E701, station_service E722→`except Exception:`, test_ws_sanity noqa E402
- **mypy 타입 수정**:
  - `database.py`: `url/key: str | None`, `supabase: AsyncClient | None`
  - `utils.py`: `token: str | None = None`
  - `services/iv_service.py`: `upload_iv_photo token: str | None`, `filename or "bin"` 방어 처리
  - `services/dev_service.py`: `data_dict: dict`, insert `# type: ignore[arg-type]`
  - `services/dashboard.py`: `cast(tuple[Any, ...], results)` gather 결과 타입 narrowing
  - `services/station_service.py`: `time_label` None guard 추가
  - `constants/meal_config.py`: `MEAL_DISPLAY_MAPPING: dict[str, str]` 타입 명시
  - `routers/iv_records.py`: `token: str | None = None`
[Status] **Phase 4-A 전체 완료**. ruff All checks passed + mypy 오류 0개.

### [2026-03-13] - Refactor 300줄: Task 10 MealGrid 유틸 분리
[Context] docs/plans/refactor-300-line-targets.md Task 10 — MealGrid.tsx Presenter vs 로직 분리 (1회 한 단위).
[Action]
- **mealGridUtils.ts** 신규: `formatDate`, `formatDisplayDate`, `MEAL_TIMES`, `PEDIATRIC_OPTIONS`, `GUARDIAN_OPTIONS`, `getRoomNoteFromMatrix`, `getTargetMealTimeForNote`, `MealMatrix` 타입 추출.
- **MealGrid.tsx**: 위 유틸/상수 제거 후 `./mealGridUtils`에서 import. 줄 수 감소.
[Status] 완료. 린트 0건. (useMealMatrix 훅·MealGridCell 추출은 후속 Task에서 진행 가능.)

### [2026-03-16] - Phase 1 Critical Fix 전체 완료

[Context] `docs/plans/code-quality-audit.md` Phase 1 감사 결과 발견된 Critical 이슈 3종(C-1 Try-Catch 전무 6파일, C-2 Test-Path 누락 2파일, C-3 SSOT 배열 중복) 수정.
[Action]
- **FIX-1** `Save-EcoBatAscii.ps1`: Test-Path 가드 + Try-Catch 적용 (C-2, C-1a 해소)
- **FIX-2** `Start-Backend.ps1`: Test-Path 가드 + Try-Catch 적용 (C-2b, C-1f 해소)
- **FIX-3** `Fix-BatEncoding.ps1`: foreach 내 파일별 Try-Catch + continue 패턴 적용 (C-1b 해소)
- **FIX-7** `Shared-DocsConstants.ps1` 신규 생성: `$script:ARCHIVED_DOC_NAMES` 배열 단일 SSOT 정의 (C-3 해소)
- **FIX-4** `Invoke-DocsRefactor.ps1`: Dot-sourcing 추가 + Move-Item/Remove-Item Try-Catch 적용 (C-1c, C-3 해소)
- **FIX-5** `Verify-DocsLinks.ps1`: Dot-sourcing 추가 + Test-Path 가드 + Set-Content Try-Catch 적용 (C-1d, C-3, I 부분 해소)
- **FIX-6** `Start-Frontend.ps1`: Set-Location + npm run 전체 Try-Catch 적용 (C-1e 해소)
- Write-Host → Write-Output 출력 스트림 통일 (7개 파일 전체)
[Status] **Phase 1 Critical Fix DoD 달성**. 잔여 Warning(J: 하드코딩 경로) 은 Phase 2+ 에서 처리 예정.

### [2026-03-16] - Phase 2: TypeScript 타입 품질 개선 완료

[Context] `docs/plans/ts-type-fix.md` 5개 FIX 항목 순차 실행.
[Action]
- **FIX-A, FIX-B** `lib/api.ts`: `cachedTauriFetch: any` → `TauriFetchFn | null`, `cachedTauriLog: any` → `TauriLogFns | null`. 인터페이스/타입 별칭 상단 정의.
- **FIX-C** `lib/api.ts`: `catch (err: any)` → `catch (err: unknown)`. `instanceof Error` 가드 이미 존재하므로 런타임 변경 없음.
- **FIX-D** `IVLabelService.ts`: `generatePreview`·`printLabel` 내 중복 12필드 파라미터 → `private static buildInvokeParams()` 단일 SSOT로 추출. ~28라인 → ~10라인.
- **FIX-E** `constants/mappings.ts`: 영어 잔재 주석 제거, `MEAL_MAP`·`ROOM_NUMBERS`에 한국어 JSDoc 추가.
- **FIX-F** `types/domain.ts`: `OptimisticStatus`, `Bed`, `AdmissionSummary`, `MealRequest`, `WsMessage` 한국어 JSDoc 추가.
[Status] 완료. ReadLints 오류 0건. (tsc --noEmit은 PowerShell 프로파일 Add-Content 차단으로 CLI 미실행 → ReadLints 대체 검증)

### [2026-03-16] - Phase 3: Hooks 수정 전체 완료

[Context] `docs/plans/hk-fix-plan.md` 7개 FIX 항목 순차 실행 (권고 순서 준수).
[Action]
- **FIX-HK-7** `useDashboardData.ts`: 이중 `useQuery` 구독 통합 → 첫 번째 useQuery에 `error: queryError` 병합, 두 번째 블록(line 81-84) 제거.
- **FIX-HK-2** `useDashboardStats.ts`: `window as any` → `'__TAURI_INTERNALS__' in (window as unknown as Record<string, unknown>)` Type Guard 적용.
- **FIX-HK-3** `useDashboardStats.ts`: `allDocItems` / `requestedDocItems` 동일 계산 2회 → `nonCanceledDocItems` 단일 변수로 통합 (SSOT).
- **FIX-HK-1** `usePatientActions.ts`: `apiAddExam` / `apiDeleteExam` / `apiMealUpdate` 3개 함수 try-catch 추가. 모든 catch 변수 `e: unknown` + `instanceof Error` 가드.
- **FIX-HK-6** `constants/mappings.ts` + `useStation.ts`: `MEAL_TIME_MAP` 상수 mappings.ts로 이전, useStation.ts 로컬 상수 제거 후 import 대체.
- **FIX-HK-4** `useVitals.ts`: `NEW_MEAL_REQUEST` / `MEAL_UPDATED` 동일 로직 → `handleMealUpdate` 내부 헬퍼 추출, fall-through case 결합.
- **FIX-HK-5** `useVitals.ts` 384라인 → 3파일 분리:
  - `useVitalsWsHandler.ts` (158라인, 신규): WS switch-case 메시지 핸들러
  - `useVitalsOptimistic.ts` (127라인, 신규): 4개 Optimistic Update 헬퍼
  - `useVitals.ts` (133라인, 축소): 조합 진입점
[Status] **Phase 3 DoD 전부 달성**. ReadLints 오류 0건. tsc CLI는 PowerShell Add-Content 프로파일 차단으로 대신 ReadLints 검증 통과.

### [2026-03-16] - Phase 4 UI Fix 전체 완료

[Context] `docs/plans/ui-fix-plan.md` 8개 이슈(3 Critical + 5 Warning) 전수 수정.
[Action]
- **C-9** `TemperatureGraph.tsx`: `payload as any` → `VitalData & { hospitalDay?; timestamp? }` 캐스팅. `VitalData`/`TemperatureGraphProps`/`arePropsEqual` → `temperatureChartUtils.ts` 이전. 304→267라인.
- **W-5** `QrCodeModal.tsx`: `window as any` → `(window as Record<string, unknown>).__TAURI_INTERNALS__` Type Guard.
- **W-1**: `lib/utils.ts` 신규 생성 (`cn` SSOT). IVStatusCard·MealRequestModal·TemperatureGraph·DocumentRequestModal 4파일 로컬 정의 제거 후 import 교체.
- **W-2** `mealGridUtils.ts`: `PEDIATRIC_EDIT_OPTIONS`, `PEDIATRIC_REQUEST_OPTIONS`, `GUARDIAN_REQUEST_OPTIONS` 파생 상수 추가. EditMealModal·MealRequestModal 로컬 중복 제거.
- **C-10** `MealRequestModal.tsx`: `fetch() + process.env.NEXT_PUBLIC_API_URL` → `api.post()` 교체.
- **W-4** `DocumentRequestModal.tsx`: `fetch() + X-Admission-Token` → `api.post(..., {headers:{...}})` 교체.
- **C-11-G1** `types/domain.ts`: `MixedMed` 인터페이스 추가. `IVLabelMedSection` / `IVLabelPreviewSection` 로컬 중복 제거 후 re-export 패턴 적용.
- **C-11-G2** `IVLabelMedSection.tsx`: showRate=true/false 양 브랜치 med 렌더링 → `MedItemRow` private 컴포넌트 추출. 277→241라인.
- **W-3** `hooks/useMealGrid.ts` 신규 생성: fetchMatrix·handleUpdate·matrix·loading·requestRef 이전. MealGrid.tsx 16라인 이하로 훅 교체.
[Status] **Phase 4 UI Fix DoD 전부 달성**. ReadLints 0건 전수 확인.

### [2026-03-16] - Code Quality Audit Phase 6: 문서 감사 완료

[Context] `docs/plans/code-quality-audit.md` Phase 6 — 마크다운 문서 3건 §12 수칙 기준 감사.
[Action]
- **DOC-1** `docs/memory.md`: 177줄(200줄 기준 미달, 즉시 요약 불필요). `[Context]/[Action]` 영어 태그는 기능적 구분자로 수용. → **Pass**
- **DOC-2** `README.md`: `Last updated: 2026-03-12` 고정 — Phase 2~4, Code Quality Audit 완료 내용 미반영. §12 유지보수 위반 확인 → 즉시 `2026-03-16` 최신화 조치.
- **DOC-3** `CLAUDE.md`: 102줄, 한국어·구조·백틱 전 항목 준수. `AI_GUIDELINES.md`와 내용 완전 중복(G 경미) — AI 에이전트 설정 목적상 수용. → **Warning(수용)**
- `code-quality-audit.md` Phase 6 결과 레코드 테이블 추가, DoD 1~3 [x] 처리.
[Status] **Phase 6 감사 완료**. 전체 Phase 1~6 DoD 1~3 달성. 잔여: DoD-4(memory.md 감사 반영 ← 현재 완료), DoD-5(fix 플랜 필요 시 생성).

### [2026-03-16] - remaining-fixes-plan Phase D: Audit 테이블 전수 최신화 완료

[Context] `docs/plans/remaining-fixes-plan.md` Phase D — `code-quality-audit.md` 감사 테이블에서 이전 세션(Phase A·B·C)에 완료된 항목들이 여전히 `⏳ 미조치`로 표기된 상태를 전수 갱신.
[Action]
- **Phase 1 테이블**: J위반 9건(`Start-Frontend`, `Setup-Environment`, `Fix-BatEncoding`, `Get-SdkVersion`, `Invoke-DocsRefactor`, `Invoke-Repomix`, `launch_wt_dev`, `Save-EcoBatAscii`, `Verify-DocsLinks`) → ✅ J 조치완료 반영(Phase C config/paths.ps1 Dot-sourcing 기준)
- **Phase 2 테이블**: 4건(`types/domain.ts`, `lib/api.ts`, `services/IVLabelService.ts`, `constants/mappings.ts`) → ✅ 조치완료 반영 (FIX-A~F 기준)
- **Phase 3 테이블**: 3건(`hooks/useDashboardStats.ts`, `hooks/usePatientActions.ts`, `hooks/useVitals.ts`) → ✅ 조치완료 반영 (FIX-HK-1~5 기준). `useDashboardData.ts`·`useStation.ts` ⏳ 유지.
- **Phase 4 테이블**: 3건(`components/IVLabelMedSection.tsx`, `components/MealRequestModal.tsx`, `components/TemperatureGraph.tsx`) → ✅ 조치완료 반영 (C-9·C-10·C-11 기준). 잔여 5건 ⏳ 유지.
- **Phase 5 테이블**: 4건(`check_encoding.py`, `doctor.py`, `security_check.py`, `save_bat_cp949.py`) → ✅ 조치완료 반영 (Phase A·B 기준)
[Status] **Phase D DoD 달성**. `code-quality-audit.md` 감사 테이블 전수 최신화 완료.

### [2026-03-16] - remaining-fixes-plan Phase B: Python Warning 2건 완료

[Context] `docs/plans/remaining-fixes-plan.md` Phase B — W-PY-1(`security_check.py`), W-PY-2(`doctor.py`) Warning 이슈 전수 수정.
[Action]
- **B-1** `scripts/security_check.py`: `check_debug_code` 내 5단계 중첩 파일 처리 로직 → `_scan_file_for_debug(item)` 헬퍼 추출로 2단계 이하로 축소. 전 함수(`print_status`, `_scan_file_for_debug`, `check_git_leaks`, `check_debug_code`, `check_rls_policies`, `main`) 한국어 docstring 추가. 반환 타입 어노테이션(`-> bool`, `-> None`, `-> list[str]`) 전수 명시.
- **B-2** `scripts/doctor.py`: `print_status`, `check_python`, `check_node`, `check_git`, `check_msvc`, `check_cargo`(영문→한국어 교체), `check_project_structure`, `main` 8개 함수 한국어 docstring 및 반환 타입 어노테이션 추가. `check_uv`는 기존 한국어 docstring 유지.
[Status] **Phase B DoD 달성**. W-PY-1, W-PY-2 Warning 해소. Phase C(PowerShell J Violation) 이어서 진행 가능.

### [2026-03-16] - remaining-fixes-plan Phase A: Python Critical 2건 완료

[Context] `docs/plans/remaining-fixes-plan.md` Phase A — C-PY-1(`check_encoding.py`), C-PY-2(`save_bat_cp949.py`) Critical 이슈 전수 수정.
[Action]
- **A-1** `scripts/check_encoding.py`: `import os` 제거 → `from pathlib import Path` 교체. 절대경로 하드코딩 → `Path(__file__).parent.parent / "eco.bat"`. `try/except OSError` 추가.
- **A-2** `scripts/save_bat_cp949.py`: `import os` → `import sys, pathlib.Path` 교체. `open(r"c:\develop\eco_pediatrics\eco.bat", ...)` → `output_path = Path(__file__).parent.parent / "eco.bat"`. `try/except OSError + raise SystemExit(1)` 추가.
- `python scripts/check_encoding.py` 실행 검증: `Encoding: utf-8 / Confidence: 0.99` 정상 출력 확인.
[Status] **Phase A DoD 달성**. C-PY-1, C-PY-2 Critical 해소. Phase B(Python Warning 2건) 이어서 진행 가능.

### [2026-03-13] - Refactor 300줄: Task 11 검증 + DoD 정리
[Context] 분리 리팩터(Task 6–10) 후 타입/린트 검증 및 플랜 DoD 확정.
[Action]
- **Task 11**: 터미널 `tsc --noEmit`은 PowerShell 프로필 오류로 실패 → ReadLints로 `frontend/src` 검증, 오류 0건 확인.
- **refactor-300-line-targets.md**: 상태 `설계 승인 대기` → `리팩토링 완료`, Definition of Done 1–4 [x] 처리.
- **memory.md**: Executive Summary에 300줄 리팩터 완료 요약 추가.
[Status] 완료. 300줄 리팩터 플랜 DoD 전부 달성.
