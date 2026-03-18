# Memory (Append-Only)

본 문서는 `Antigravity IDE Agent`의 연속성 보존을 위한 실시간 메모리 로그입니다.

## Executive Summary
- **UI/UX 안정화 (2026-03-18) [완료]**: 식단 플리커링, 고열 환자 테마, Z-index, 수액 속도 공란 기록 방지.
- **대규모 리팩토링 (2026-03-18) [완료]**: `IVLabelPreviewModal.tsx`, `station.py` 등 모든 파일 300라인 제한 준수.
- **프론트엔드 기동 안정성 (2026-03-17) [완료]**: PS 에러 오독 현상 및 `tauri.conf.json` 최적화 완료.
- **문서 통합 이관 (2026-03-17) [완료]**: `AI_GUIDELINES.md` SSOT 체계 구축 및 `.antigravityrules` 경로 수정.
- **에러 핸들링 고도화 (2026-03-18) [완료]**: LSP 에러 가드, 요청 취소(`AbortError`) 로깅 분리, PowerShell CMD 명령 차단.
- **Phase 5 테스트/린트 (2026-03-16) [완료]**: 백엔드 31/31 통과 및 프론트엔드 Vitest 19/19 무결함 상태 유지.

## Logs
> **이전 로그 보관**: [Memory Archive Index](./archive/)
> - [2026/03/17 이전](./archive/memory_log_20260317_before.md)
> - [2026/03/18 (v1)](./archive/memory_log_20260318_v1.md)
### [2026-03-18] - 수액 라벨 인쇄 모달 동작 개선 [완료]
- **동작 수정**: `useIVLabel.ts`에서 인쇄 성공 시 호출되던 `onClose()`를 제거하여 모달이 닫히지 않고 연속 작업이 가능하도록 함.
- **실행 확인**: `IVLabelService.ts` 및 `useIVLabel.ts`에 인쇄 명령 성공 로그(`console.debug`)를 추가하여 백엔드 호출 여부 확인 가능하게 보강.
- **자가 검증**: `npx tsc --noEmit` 통과 및 Blueprint 모든 Task 완료 확인. ✅
- **Status**: 완료. 관련 설계 문서 `docs/plans/iv_label_print_modal_behavior.md` 업데이트 완료.

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
