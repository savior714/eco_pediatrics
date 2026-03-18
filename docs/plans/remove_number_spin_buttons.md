# 🗺️ Project Blueprint: 수치 입력 컴포넌트 증감 버튼 제거

> 생성 일시: 2026-03-18 13:45 | 상태: 설계 승인 대기

## 🎯 Architectural Goal

- **사용자 경험 개선**: 모든 수치(체온, 수액 속도, 약물량 등) 입력 필드에서 브라우저 기본 및 커스텀 증감 버튼(Up/Down arrows)을 제거하여 의도치 않은 수치 변경을 방지하고 깔끔한 UI를 제공한다.
- **SSOT 정렬**: `docs/CRITICAL_LOGIC.md`와의 충돌 없음.

## 🔍 Impact Scope (영향 범위)

| 수정 대상 파일 | 현재 라인 수 | 참조하는 파일 | 비고 |
|--------------|:----------:|-------------|------|
| `frontend/src/components/ui/NumberInput.tsx` | 72줄 | `VitalModal.tsx` | UI 공통 컴포넌트 |
| `frontend/src/components/IVLabelMedSection.tsx` | 271줄 | `IVLabelPreviewModal.tsx` | 수액 라벨 설정 |
| `frontend/src/components/IVUploadForm.tsx` | 223줄 | `IVStatusCard.tsx` | 수액 속도 기록 |
| `frontend/src/components/VitalModal.tsx` | 92줄 | `PatientDetailHeader.tsx` | 체온 기록 |

## 🔄 Rollback Strategy (롤백 전략)

- **체크포인트**: 작업 시작 전 현재 Git 상태를 확인한다. (`git status`)
- **단계별 복구**: 각 Task 실패 시 해당 파일만 `git checkout -- [파일경로]`로 복원한다.

## 🛠️ Step-by-Step Execution Plan

### 📦 Task List

- [x] **Task 1: NumberInput.tsx 에서 증감 버튼 제거**
  - **Action**: 파일 수정
  - **Target**: `frontend/src/components/ui/NumberInput.tsx`
  - **Goal**: Ark UI의 `IncrementTrigger`, `DecrementTrigger` 및 관련 아이콘(ChevronUp, ChevronDown) 코드를 제거한다.
  - **Verify**: `NumberInput` 컴포넌트 내부에 버튼 관련 코드가 존재하지 않음을 확인한다.
  - **Dependency**: None

- [x] **Task 2: IVLabelMedSection.tsx 에서 스핀 버튼 숨기기**
  - **Action**: 파일 수정
  - **Target**: `frontend/src/components/IVLabelMedSection.tsx`
  - **Goal**: 약물량(amount) 입력 필드(`type="number"`)에 스핀 버튼을 숨기는 CSS 스타일([appearance:textfield] 등)을 적용한다.
  - **Verify**: `MedItemRow` 컴포넌트 내 `input[type="number"]`에 스타일이 추가되었는지 확인한다.
  - **Dependency**: None

- [x] **Task 3: 검증 및 정리**
  - **Action**: 터미널 실행
  - **Command**: `npx tsc --noEmit`
  - **Goal**: 변경 사항으로 인한 타입 에러 유무 확인 및 `docs/memory.md` 업데이트
  - **Verify**: 오류 0개 출력 확인
  - **Dependency**: Task 1, 2

## ⚠️ 기술적 제약 및 규칙

- **CSS 스핀 버튼 제거**: `[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none` 클래스를 적극 활용한다.
- **모듈화**: 기존 300라인 미만이므로 리팩토링 없이 진행한다.

## ✅ Definition of Done

1. [x] `NumberInput`에서 상하 화살표 버튼이 제거됨.
2. [x] `IVLabelMedSection`의 모든 수치 입력 필드에 스핀 버튼 제거 스타일이 적용됨.
3. [x] `type="number"`를 사용하는 모든 필드에서 의도치 않은 증감이 발생하지 않도록 조치됨.
4. [x] 타입 체크 및 린트 오류 Zero 달성.
