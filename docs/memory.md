# Memory (Append-Only)

본 문서는 `Antigravity IDE Agent`의 연속성 보존을 위한 실시간 메모리 로그입니다.

## Executive Summary

- **프론트엔드 기동 NativeCommandError 해결 (2026-03-17) [완료]**: `scripts/Start-Frontend.ps1` 내 `$ErrorActionPreference` 조정 및 `tauri.conf.json` 내 불필요한 `cmd /C` 제거를 통해 PowerShell의 정보성 에러 오독 현상 해결. 기동 안정성 확보.
- **문서 아키텍처 통합 및 정제 (2026-03-17) [완료]**: `CRITICAL_LOGIC.md`에서 터미널 표준/에이전트 지침을 `AI_GUIDELINES.md`로 이관 완료(Task 1~4). `.antigravityrules` 경로 무결함 확보. `CRITICAL_LOGIC.md`는 순수 비즈니스 도메인 문서로 정제됨. 인코딩 무결성 검증 완료.
- **CRITICAL_LOGIC.md 강화 (2026-03-16)**: `AI_GUIDELINES.md` 기반 §2.7.4~2.7.6 (PowerShell 세션 초기화·체이닝 금지·Terminal Noise SOP), §2.9 신규 (TS6133 Catch Hygiene·Import 보존·Self-Audit·Rollback-First), §5.2 신규 (Pre-flight Validation·Error Recovery 4단계) 삽입. 목차 갱신. 284→284줄 (300 이내 유지).

- **Phase 5 전체 완료 (2026-03-16)**: Task 1~6 전수 완료. 백엔드 31/31 (기존 6개 실패 수정 포함), 프론트엔드 Vitest 19/19 전통과. `eco test`·`eco lint` DX 단일 진입점 구축. `Run-Tests.ps1` AST 검증·인코딩 설정·전제 조건 검사 전수 구현. ReadLints 0건. Phase 5 DoD 6/6 달성.
- **Phase 5 Task 3 완료 (2026-03-16)**: `test_vitals/meals/iv_records_integration.py` 3파일 12개 테스트 작성 (Happy Path + 422 검증). `execute_with_retry_async` 모듈 레벨 패치, `app.state.supabase` 사전 주입 전략으로 외부 DB 의존성 완전 제거. 12/12 통과, 전체 31개 수집.
- **Phase 5 Task 2 완료 (2026-03-16)**: `backend/tests/conftest.py` 생성. `sys.path` 주입(backend 루트), `client`(ASGITransport+init_supabase mock), `mock_supabase`, `sample_admission/vital/meal_request` 픽스처 구성. collect 15→19개, 기존 import 오류 3건 해소.
- **Phase 5 Task 1 완료 (2026-03-16)**: `backend/pyproject.toml`에 `pytest-asyncio>=0.25` dev 그룹 추가, `[tool.pytest.ini_options]`(asyncio_mode=auto, testpaths, addopts) + `[tool.coverage.run]` 섹션 구성 완료.
- **A 경미 JSDoc 일괄 완료 (2026-03-16)**: `pending-fixes.md` 2순위 — 9개 파일 한국어 JSDoc 추가 + 영어 주석 전수 교체. `IVLabelPreviewModal`·`IVStatusCard`·`MealGrid`·`EditMealModal`·`DocumentRequestModal`·`QrCodeModal`·`PatientDetailModal`·`IVUploadForm`·`useStationActions` 전수 처리. ReadLints 0건.
- **remaining-fixes-plan Phase D 완료 (2026-03-16)**: `code-quality-audit.md` 감사 테이블 전수 최신화 (Phase 1~5 ✅ 반영). `remaining-fixes-plan.md` DoD 달성.
- **Code Quality Audit Phase 1~6 전체 완료 (2026-03-16)**: PS Critical 3종·TS any 제거·Hooks 7 FIX·UI 8 FIX·Python A·B·C·D Phase 전수 수행. `lib/utils.ts` 신규(cn SSOT), `hooks/useMealGrid.ts` 신규, `useVitals.ts` 384→133라인 분리. ReadLints 0건.
- **300줄 리팩터 완료 (2026-03-13)**: IVLabelPreviewModal→MedSection, useVitals 분리, TemperatureGraph→utils, useStation→Dashboard, MealGrid→utils. ReadLints 0건.
- **docs 통합 (2026-03-13)**: 완료 플랜 4건 archive 이관, docs/README.md 갱신, Broken Links 0건.
- **Phase 4-A 전체 완료 (2026-03-12)**: pyproject.toml 그룹 분리(Core/Dev/Tools), Pydantic v2 전환, ruff 0 + mypy 0 달성.
- **Tauri IPC 아키텍처 전환 (2026-03-10)**: QR 창 Re-instance → IPC emit/listen. `WindowManager` 유틸 분리.
- **Phase 2 상태관리 안정화 (2026-03-10)**: React Query 도입, WS Exponential Backoff, StationContext 격리.
- **Phase 1 타입 안전성 (2026-03-10)**: TS any 제거, pendingMutations, ErrorBoundary, toaster 전환.

---

## Logs

### [2026-03-17] - 프론트엔드 기동 NativeCommandError 분석 및 해결 계획 수립

[Context] `eco.bat` 실행 후 프론트엔드 창에서 PowerShell `NativeCommandError`가 발생하는 현상 보고됨. Tauri CLI가 `stderr`로 출력하는 정보성 메시지를 PowerShell이 치명적 에러로 오해하여 발생함.

[Action]
- **원인 분석**: `scripts/Start-Frontend.ps1`에서 `npm run tauri dev 2>&1` 리다이렉션 사용 시 PS의 엄격한 네이티브 에러 체크가 트리거됨.
- **설계 완료**: `docs/plans/fix_frontend_startup_error.md` 생성. `$ErrorActionPreference` 조정 및 `tauri.conf.json` 최적화 계획 포함.

[Status] Phase 전체 완료 (NativeCommandError 해결 및 tauri.conf.json 최적화). DoD 3/3 달성. 시각적 확인 완료.

### [2026-03-17] - 문서 마이그레이션 Task 3 완료: CRITICAL_LOGIC.md 정제

[Context] `CRITICAL_LOGIC.md`에 혼재된 비도메인 지식(터미널 표준, 에이전트 지침 등)을 `AI_GUIDELINES.md`로 통합 완료함에 따라, 원본 문서를 프로젝트 전용 비즈니스 로직에 집중하도록 정제함.

[Action]
- **CRITICAL_LOGIC.md 정제**: §2.6(터미널), §2.7(PowerShell), §5.2(에러 복구 프로토콜), §6(스킬 관리) 섹션 및 목차 항목 전수 제거.
- **인코딩 무결성 확보**: 특수 문자(`§`)로 인한 인코딩 오독 문제를 해결하기 위해 UTF-8(No BOM)으로 재생성 완료.
- **Task List**: `doc_migration.md` 내 Task 3 완료 표시.

[Status] Task 3 완료. 최종 검증(Task 4) 대기 중.

### [2026-03-17] - 문서 마이그레이션 Task 1 완료: AI_GUIDELINES.md 통합


[Context] `docs/plans/doc_migration.md` 기반 문서 정체성 분리 및 통합 작업 개시.

[Action]
- **AI_GUIDELINES.md 업데이트**: `CRITICAL_LOGIC.md`에 파편화되어 있던 §2.7.2(wt.exe 쿼팅 규칙), §2.7.3($PSScriptRoot 최종 표준), §6(스킬 배포 프로토콜) 내용을 통합 이관함.
- **Task List**: Task 1(AI_GUIDELINES.md 통합) 완료 표시됨.

[Status] Task 1, 2 완료. 다음 단계: CRITICAL_LOGIC.md 정제 (Task 3).

### [2026-03-17] - 문서 마이그레이션 Task 2 완료: .antigravityrules 경로 수정

[Context] `.antigravityrules` 파일 내의 가이드라인 참조 경로가 레거시 경로(`bootstrap`)로 설정되어 있어 이를 실제 프로젝트 경로로 수정함.

[Action]
- **.antigravityrules 업데이트**: `c:\develop\bootstrap\AI_GUIDELINES.md` → `c:\develop\eco_pediatrics\AI_GUIDELINES.md`로 2개 항목 수정 완료.
- **Task List**: `doc_migration.md` 내 Task 2 완료 표시.

[Status] Task 2 완료. 후속 작업(Task 3: CRITICAL_LOGIC.md 정제) 준비 완료.

### [2026-03-16] - A 경미 JSDoc 일괄 처리 완료

[Context] `docs/plans/pending-fixes.md` 2순위 — 9개 파일 영어 주석 혼용·JSDoc 전무 항목 전수 수정.

[Action]

- **IVLabelPreviewModal.tsx**: `[Category N]` 영어 레이블 4건 → 한국어. Interface·Component·handleLabChange·handlePrint·formatMeds JSDoc 추가.
- **IVStatusCard.tsx**: `IVStatusCardProps` Interface + Component JSDoc 추가 (필드별 설명 포함).
- **MealGrid.tsx**: `Render Cell Helper` 영어 주석 → 한국어. Interface·Component·renderCell·RoomNoteInput JSDoc 추가.
- **EditMealModal.tsx**: Interface Props 필드 JSDoc + Component + handleSubmit JSDoc 추가.
- **DocumentRequestModal.tsx**: Interface·상수(DOCUMENT_IDS/OPTIONS)·Component·toggleItem·handleSubmit JSDoc 추가.
- **QrCodeModal.tsx**: 영어 주석 2건 교체. Interface·Component·handleOpenSmartphoneWindow JSDoc 추가.
- **PatientDetailModal.tsx**: Interface Props 필드 JSDoc + Component JSDoc 추가.
- **IVUploadForm.tsx**: 영어 JSX 주석 9건 → 한국어. Interface·Component·handleUpload JSDoc 추가. `// Clear after success` → 한국어.
- **useStationActions.ts**: Hook·handleAdmit·handleNotificationClick·handleDischargeAll·handleSeedSingle·handleCardClick·handleQrClick JSDoc 7건 추가. `console.error` 영문 메시지 2건 → 한국어.

[Status] **A 경미 9건 DoD 달성**. ReadLints 0건 전수 확인. `pending-fixes.md` 잔여: 3순위(useStation.ts 모니터링, 트리거 기반).

---

### [2026-03-16] - Code Quality Audit 전체 완료 (Phase 1~D 압축 요약)

[Context] `docs/plans/code-quality-audit.md` 기반 전체 감사·수정 세션 압축.

[Action 요약]

- **Phase 1 PS Critical**: Try-Catch 전무·Test-Path 누락·SSOT 위반 7파일 + `Shared-DocsConstants.ps1` 신규.
- **Phase 2 TS**: `lib/api.ts` any 3건 제거, `IVLabelService.ts` DRY, `mappings.ts`·`domain.ts` JSDoc.
- **Phase 3 Hooks**: `useVitals.ts` 384→133라인(WsHandler·Optimistic 분리), FIX-HK-1~7 전수.
- **Phase 4 UI Fix**: `lib/utils.ts` 신규(cn SSOT), `useMealGrid.ts` 신규, fetch→api 교체, `MixedMed` SSOT.
- **Phase A·B Python**: try/except 추가·절대경로 pathlib 교체·한국어 docstring 전수.
- **Phase C PS J-Violation**: `config/paths.ps1` 신규(10개 상수), 9개 스크립트 Dot-sourcing 전환.
- **Phase D Audit 갱신**: `code-quality-audit.md` ⏳→✅ 전수 반영.
- **Phase 6 Docs**: `README.md` Last updated 최신화, `memory.md` Pass, `CLAUDE.md` 수용.

[Status] 전체 DoD 달성. `code-quality-audit.md`·`remaining-fixes-plan.md` 완료 후 삭제.

---

### [2026-03-10~13] - 이전 세션 압축 요약

[Action]
- **TS 타입 오류 수정**: `DocumentStatus` CANCELED 추가, `LucideIcon` size 타입 완화, `TemperatureGraph activeDot` 캐스팅.
- **Tauri IPC**: `tauriWindowManager.ts` 신규, QR 창 IPC emit/listen 전환, capabilities default.json 갱신.
- **Phase 4-A**: pyproject.toml Core/Dev/Tools 분리, ruff All checks + mypy 0개.
- **300줄 리팩터**: `mealGridUtils.ts`·`temperatureChartUtils.ts`·`IVLabelMedSection.tsx` 분리.
- **docs 통합**: archive 이관 4건, Broken Links 0건.

[Status] 모든 세션 완료. 현재 잔여 작업: useStation.ts 300라인 트리거 모니터링만 존재.
