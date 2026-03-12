# Memory (Append-Only)

## Executive Summary
본 문서는 `Antigravity IDE Agent`의 연속성 보존을 위한 실시간 메모리 로그입니다.
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

### [2026-03-13] - Refactor 300줄: Task 11 검증 + DoD 정리
[Context] 분리 리팩터(Task 6–10) 후 타입/린트 검증 및 플랜 DoD 확정.
[Action]
- **Task 11**: 터미널 `tsc --noEmit`은 PowerShell 프로필 오류로 실패 → ReadLints로 `frontend/src` 검증, 오류 0건 확인.
- **refactor-300-line-targets.md**: 상태 `설계 승인 대기` → `리팩토링 완료`, Definition of Done 1–4 [x] 처리.
- **memory.md**: Executive Summary에 300줄 리팩터 완료 요약 추가.
[Status] 완료. 300줄 리팩터 플랜 DoD 전부 달성.
