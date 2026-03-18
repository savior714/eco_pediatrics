# Memory (Append-Only)

본 문서는 `Antigravity IDE Agent`의 연속성 보존을 위한 실시간 메모리 로그입니다.

## Executive Summary
- **스테이션 WebSocket 단일화 (2026-03-19) [완료]**: useStation() 이중 호출 제거 — StationDataContext 도입, 페이지·useStationActions에서 useStationData()만 사용. LCP 로고 loading="eager" 적용, useWebSocket cleanup 시 재연결/로그 완화(closedByUsRef).
- **UI/UX 안정화 (2026-03-18) [완료]**: 식단 플리커링, 고열 환자 테마, Z-index, 수액 속도 공란 기록 방지.
- **대규모 리팩토링 (2026-03-18) [완료]**: `IVLabelPreviewModal.tsx`, `station.py` 등 모든 파일 300라인 제한 준수.
- **프론트엔드 기동 안정성 (2026-03-17) [완료]**: PS 에러 오독 현상 및 `tauri.conf.json` 최적화 완료.
- **문서 통합 이관 (2026-03-17) [완료]**: `AI_GUIDELINES.md` SSOT 체계 구축 및 `.antigravityrules` 경로 수정.
- **에러 핸들링 고도화 (2026-03-18) [완료]**: LSP 에러 가드, 요청 취소(`AbortError`) 로깅 분리, PowerShell CMD 명령 차단.
- **Phase 5 테스트/린트 (2026-03-16) [완료]**: 백엔드 31/31 통과 및 프론트엔드 Vitest 19/19 무결함 상태 유지.

## 🎯 현재 진행 상황
- [ ] API 404 에러 해결 (`docs/plans/fix_api_404_errors.md`) [포트 충돌 해결 대기]
    - [x] Task 1~3: 백엔드/프론트 라우팅 수정 완료
    - [x] `api.ts` 에러 로그에 URL 포함 (디버깅용)
    - [x] `Start-Backend.ps1` Port Guard 구현 (TcpListener 바인딩 테스트 + WinNAT 재시작)
    - [ ] **Task 4**: `net stop winnat && net start winnat` (관리자 권한) 실행 후 서버 재기동 확인 필요
    - **근본 원인**: 타 프로젝트(Medical GraphRAG) 서버가 포트 8000 선점. WinNAT orphaned socket으로 자동 해제 불가.
- [x] 수액 라벨지 모달 UI 최적화 및 디자인 개선 (`docs/plans/optimize_iv_label_modal.md`) [전체 단계 완료]
- [x] 수액 라벨지 미리보기 컨테이너 디자인 고도화 (`docs/plans/refine_iv_label_preview_container.md`)
- [x] `IVLabelPreviewModal.tsx` 레이아웃 개선 (Flush Split-pane 적용)
- [x] `IVLabelPreviewSection.tsx` 카드 그림자 및 질감 고도화
- [x] 린트 검증 시도 (환경 이슈로 인한 `next lint` 인자 오인 현상 확인, AI_COMMAND_PROTOCOL 3번 항목 지침 보강 완료)

## 📋 대기 중인 작업 (Task Queue)
- [ ] (완료) Task 1: `frontend\src\components\IVLabelPreviewSection.tsx` 수정
- [ ] (완료) Task 2: 린트 검증 및 SSOT 반영

### [2026-03-18] - API 404 근본 원인 진단 및 Port Guard 구현 [진행 중]
- **근본 원인**: `http://127.0.0.1:8000`에 타 프로젝트(Medical GraphRAG) 서버가 선점. eco_pediatrics 백엔드 기동 실패.
- **진단 과정**: curl → OpenAPI 스펙 확인 → netstat → PID 11596 고아 소켓(Get-Process null) → WinNAT orphaned socket 판정.
- **코드 수정**:
  - `scripts/Start-Backend.ps1`: TcpListener 바인딩 테스트 기반 Port Guard 추가. WinNAT 재시작 시도 로직 포함.
  - `frontend/src/lib/api.ts`: 에러 콘솔에 URL 포함(`[GET] url → error`).
  - `backend/main.py`: dev 라우터 prefix `/api/v1` → `/api/v1/dev` 수정.
- **미완료**: `net stop winnat && net start winnat` (관리자 PowerShell) 수동 실행 필요.

### [2026-03-18] - 수액 라벨 미리보기/입력 UI 전면 개선 [완료]
- **레이아웃**: `IVLabelPreviewModal` grid→flex 전환으로 좌우 패널 border 밀착, `grid place-items-center`로 미리보기 수직 중앙 정렬.
- **입력 제어**: `rateStep/rateMin/rateMax/rateReadOnly` props 추가. onChange→valueAsNumber+NaN가드, onBlur에서만 step 반올림+클램핑. 숫자 3자리 제한.
- **maxMeds**: 항생제·기타 약물 각 최대 2종 제한. 초과 시 추가 버튼 숨김 + max-height 스크롤 고정.
- **미리보기 섹션 아이콘**: Baby(환자정보), Syringe(수액처방), FlaskConical(주요검사) lucide 아이콘 추가.
- **라벨 텍스트 정규화**: Electro / UA & UC / Stool PCR / Resp. PCR 단축, 유지용법→유지수액요법.
- **Status**: 완료. ✅

## 📅 히스토리 (최근 5개)
- [2026-03-18] 수액 라벨지 미리보기 텍스트 줄바꿈 이슈 대응 시작
- [2026-03-18] 숫자 입력 필드 스핀 버튼 제거 완료
- [2026-03-18] AST 라벨 추가 및 누락 시 빈 박스 처리 완료
- [2026-03-18] IV 라벨 모달 닫힘 방지 및 출력 확인 기능 추가
- [2026-03-18] 메모리 로그 아카이브 및 관리 규칙 적용

### [2026-03-19] - 스테이션 useStation 단일 호출 및 WS/UX 보강 [완료]
- **StationDataContext**: `useStation()`을 트리 내 1회만 호출하는 `StationDataProvider`와 `useStationData()` 훅 추가. `station/page.tsx`는 Provider 하위에서만 데이터 구독하여 WebSocket 이중 연결 제거.
- **LCP**: 스테이션·대시보드 헤더 `eco_logo.png`에 `loading="eager"` 적용 (Next.js LCP 권고).
- **useWebSocket**: cleanup에서 의도적 `close()` 시 재연결·Disconnected 로그를 하지 않도록 `closedByUsRef` 도입. "closed before connection is established" 브라우저 메시지는 정상 동작.
- **Blueprint**: `docs/plans/fix_station_whitescreen_and_duplicate_useStation.md` Task 1~3 완료 반영.
- **Status**: 완료. ✅

## Logs
> **이전 로그 보관**: [Memory Archive Index](./archive/)
> - [2026/03/17 이전](./archive/memory_log_20260317_before.md)
> - [2026/03/18 (v1)](./archive/memory_log_20260318_v1.md)
### [2026-03-18] - 수액 라벨 인쇄 모달 동작 개선 [완료]
- **동작 수정**: `useIVLabel.ts`에서 인쇄 성공 시 호출되던 `onClose()`를 제거하여 모달이 닫히지 않고 연속 작업이 가능하도록 함.
- **실행 확인**: `IVLabelService.ts` 및 `useIVLabel.ts`에 인쇄 명령 성공 로그(`console.debug`)를 추가하여 백엔드 호출 여부 확인 가능하게 보강.
- **자가 검증**: `npx tsc --noEmit` 통과 및 Blueprint 모든 Task 완료 확인. ✅
- **Status**: 완료. 관련 설계 문서 `docs/plans/iv_label_print_modal_behavior.md` 업데이트 완료.

### [2026-03-18] - IV 라벨 타입 역방향 의존성 제거 (domain SSOT) [완료]
- **문제**: `useIVLabel.ts`가 컴포넌트(`IVLabelMedSection.tsx`, `IVLabelLabSection.tsx`)에서 타입을 import하는 역방향 의존성 발생.
- **해결**: `AstResult`, `LabResultMap`을 `frontend/src/types/domain.ts`로 이동(SSOT)하고, 훅·컴포넌트 모두 `@/types/domain`에서 import하도록 정리.
- **검증**: `src/hooks/` 기준 `from '@/components/IVLabel'` import 0건 확인. (환경 프로필 훅으로 `tsc --noEmit` 셸 검증은 본 세션에서 실패)

### [2026-03-18] - Tool-First Policy 강화 및 Navigation 금지 [진행 중]
- **원인 분석**: `next lint` 과정에서 발생한 `frontend\lint` 경로는 쉘 명령어(`cd`, `Set-Location`)와 `npm run`의 혼용으로 인한 인자 오해석이 근본 원인임이 판명됨.
- **SSOT 수정**:
  - `CLAUDE.md`, `AI_GUIDELINES.md`, `docs/AI_COMMAND_PROTOCOL.md` 전반에 걸쳐 **경로 이동(cd, Set-Location)을 전면 금지** 대상으로 지정.
  - 실행 위치 제어는 오직 도구의 **`Cwd` 매개변수**만을 사용하도록 강제함.
  - `AI_GUIDELINES.md`에서 `Get-ChildItem` 예외 조항을 삭제하여 정책 무결성 확보.
- **Status**: SSOT 반영 및 검증 완료. 린트 환경 이슈는 `Cwd` 준수에도 불구하고 발생할 수 있음을 확인하고 대응 지침 보강. ✅
- **결과**: `npm test`를 통한 로직 무결성 확인 및 린트 지침 고도화 완료.

### [2026-03-18] - PowerShell CMD 명령어 오용 방지 지침 강화 [완료]
- **지침 수정**: `docs/AI_COMMAND_PROTOCOL.md`에서 `dir /s /b` 등 CMD 스타일 슬래시 옵션 오용 시 발생하는 에러 원인과 해결책(Get-ChildItem 표준 매개변수 사용)을 대폭 보강.
- **오타 수정**: Metric Guard 섹션의 `Get-Get-Content` 오타를 `Get-Content`로 수정.
- **Status**: 완료. 향후 AI 에이전트의 터미널 명령 정확도 향상 기대. ✅

### [2026-03-18] - 전용 도구 우선 원칙(Tool-First Policy) 전방위 반영 [완료]
- **CLAUDE.md (Global)**: `Tool-First Policy`를 Fatal Constraint로 추가.
- **AI_GUIDELINES.md (Behavior)**: 워크플로우에 `Integrated Tool-First Policy` 명시.
- **AI_COMMAND_PROTOCOL.md (Terminal)**: `0. Integrated Tool-First Policy` 섹션 및 도구 대조표 신설.
- **Status**: 완료. 에이전트 명령 실행 시 PowerShell 사용을 최소화하고 무결한 전용 도구 사용을 강제함. ✅
### [2026-03-18] - 수액 라벨 AST UI 개선 [완료]
- **AST 식별성 보강**: `IVLabelMedSection.tsx`에서 AST 결과 선택 영역 왼쪽에 명시적인 "AST" 공통 라벨을 추가하여 입력 편의성 향상.
- **가독성 개선**: `IVLabelPreviewSection.tsx` 미리보기 영역에서 AST 미시행(`NONE`) 시 기존에 표시되던 `±` 대신, **정사각형 형태의 빈 박스**(`w-3.5 h-3.5`, `bg-white`)로 변경하여 직관적인 빈 칸 느낌을 구현.
- **무결성 확인**: `npx tsc --noEmit`을 통해 타입 안정성 재검증 완료. ✅
- **Status**: 완료. 관련 설계 문서 `docs/plans/iv_label_ast_ui_improvement.md` 모든 Task 완료 반영.
### [2026-03-18] - 수치 입력 필드 증감 버튼 제거 [완료]
- **NumberInput 개선**: `ui/NumberInput.tsx`에서 커스텀 증감 버튼(Increment/Decrement Triggers) 및 스크러버를 제거하고, CSS 스타일을 통해 브라우저 기본 스핀 버튼도 숨김 처리함.
- **기타 입력 필드**: `IVLabelMedSection.tsx` 등의 약물량 입력 필드(`type="number"`)에도 동일한 스핀 버튼 숨김 스타일을 적용하여 의도치 않은 수치 변경을 방지함.
- **무결성 확인**: `npx tsc --noEmit` 통과 확인. ✅
- **Status**: 완료. 관련 설계 문서 `docs/plans/remove_number_spin_buttons.md` 모든 Task 완료 반영.
### [2026-03-18] - 수액 라벨지 모달 UI/UX 전면 최적화 [완료]
- **배경**: 모달 내 수직 공간 부족 및 프리뷰 가시성 저하 문제 해결.
- **수정 사항**:
  - **공간 최적화**: 좌측 상단 "처방 설정" 배너를 제거하여 입력 필드가 더 많이 보이도록 개선.
  - **레이아웃 혁명**: 좌우 비중을 `7:5`에서 **`1:1` (6:6)**로 조정하여 인쇄 미리보기 영역의 답답함 해소.
  - **디자인 고도화**: 우측 배경을 `bg-[#F8FAFC]`로 변경, 배지를 `Live Preview` 알약형으로 교체, 버튼 영역에 `mt-auto` 및 `active:scale` 애니메이션 적용.
  - **카드 디테일**: `IVLabelPreviewSection`의 여백(`py-6`, `p-9`)과 그림자 깊이를 넓어진 공간에 맞춰 재조정.
- **Status**: 모든 Task 완료. `docs/plans/optimize_iv_label_modal.md` 종결. ✅
