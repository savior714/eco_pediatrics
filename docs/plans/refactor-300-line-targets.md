# Project Blueprint: 300줄 이상 리팩토링 대상 정리

> 생성 일시: 2026-03-12 | 상태: 리팩토링 완료

## Architectural Goal

- **글로벌 룰 0(모듈화)**: 파일이 **300라인 이상**이거나 이름에 `And`, `Manager` 등이 포함되어 책임이 과중할 때, **기능 수정 전 Refactoring Task를 선행**한다.
- 본 문서는 해당 규칙에 따른 **리팩토링 후보 목록**을 SSOT로 정리하여, 후속 세션에서 선택적 분리 작업 시 가이드라인으로 활용한다.
- **SSOT**: `docs/CRITICAL_LOGIC.md` §2.1(프론트엔드 비즈니스 로직 → hooks, 컴포넌트 순수성 유지) 및 §2.2(React Query SSOT)와 정렬.

## 스캔 결과 요약

| 구분 | 300줄 이상 파일 수 | 비고 |
|------|-------------------|------|
| **Frontend** | 5 | `.ts` / `.tsx` |
| **Backend** | 0 | 최대 `dev_service.py` 223줄 |

---

## 리팩토링 대상 목록 (우선순위: 줄 수 내림)

| 순위 | 파일 | 줄 수 | 책임 과중 여부 |
|------|------|-------|-----------------|
| 1 | `frontend/src/components/IVLabelPreviewModal.tsx` | 702 | 모달 + 미리보기 + IV 라벨 UI 혼재 |
| 2 | `frontend/src/hooks/useVitals.ts` | 460 | 바이탈 조회/구독/대시보드 데이터 통합 |
| 3 | `frontend/src/components/TemperatureGraph.tsx` | 389 | 차트 + 인터랙션 + 포맷 로직 |
| 4 | `frontend/src/hooks/useStation.ts` | 329 | 스테이션/대시보드 상태 통합 |
| 5 | `frontend/src/components/MealGrid.tsx` | 319 | 그리드 + 식단 요청/모달 연동 |

**이름 기준 과중 검토**: `tauriWindowManager.ts`는 58줄로 300줄 미만. `*And*`, `*Manager*` 이름의 300줄 이상 파일 없음.

---

## Step-by-Step Execution Plan

> 각 Task는 **단 하나의 도구 호출(Read / Edit / Write / Bash 중 1개)**로 완료된다.  
> 기능 수정 전 해당 파일을 다룰 경우 **선택한 Refactoring Task를 선행**할 것.

### Task List

- [x] **Task 1: IVLabelPreviewModal.tsx 읽기 — 구조 및 책임 경계 파악**
  - **Tool**: `Read`
  - **Target**: `frontend/src/components/IVLabelPreviewModal.tsx`
  - **Goal**: 모달/미리보기/IV 라벨 블록 단위로 분리 가능 구간 식별
  - **Dependency**: None

- [x] **Task 2: useVitals.ts 읽기 — 훅 내부 도메인 경계 파악**
  - **Tool**: `Read`
  - **Target**: `frontend/src/hooks/useVitals.ts`
  - **Goal**: 바이탈 전용 / 대시보드 데이터 / 구독 로직 분리 후보 식별
  - **Dependency**: None

- [x] **Task 3: TemperatureGraph.tsx 읽기 — 차트 vs 유틸 분리점 파악**
  - **Tool**: `Read`
  - **Target**: `frontend/src/components/TemperatureGraph.tsx`
  - **Goal**: 차트 컴포넌트 vs 포맷/도메인 유틸 분리 가능 구간 식별
  - **Dependency**: None

- [x] **Task 4: useStation.ts 읽기 — 스테이션 vs 대시보드 책임 파악**
  - **Tool**: `Read`
  - **Target**: `frontend/src/hooks/useStation.ts`
  - **Goal**: 스테이션 목록/선택과 대시보드 데이터 책임 분리 후보 식별
  - **Dependency**: None
  - **결과**: 스테이션 코어(beds, setBeds, fetchAdmissions, admissionsToBeds/emptySlotsInitial) / 알림·대시보드(notifications, lastUploadedIv, lastUpdated, fetchPendingRequests, removeNotification) / WS handleMessage(메시지 타입별 분기) — 분리 시 `useStationNotifications` 또는 `useStationDashboard`로 알림·pending 요청·lastUploadedIv 담당 훅 추출 권장.

- [x] **Task 5: MealGrid.tsx 읽기 — 그리드 vs 액션/모달 경계 파악**
  - **Tool**: `Read`
  - **Target**: `frontend/src/components/MealGrid.tsx`
  - **Goal**: 순수 그리드 Presenter vs 요청/모달 로직 분리점 식별
  - **Dependency**: None
  - **결과**: (1) **유틸/상수 분리**: `formatDate`, `formatDisplayDate`, `getRoomNoteFromMatrix`, `getTargetMealTimeForNote`, `PEDIATRIC_OPTIONS`, `GUARDIAN_OPTIONS`, `MEAL_TIMES` → `mealGridUtils.ts` 추출 권장. (2) **데이터/요청 계층**: `fetchMatrix` + `matrix`/`loading` 상태 → 커스텀 훅 `useMealMatrix(beds, activeDate)`로 분리 시 Presenter는 `matrix`, `loading`, `refetch`만 소비. (3) **액션**: `handleUpdate`(낙관적 갱신 + `POST /api/v1/meals/requests`)는 동일 훅의 `updateMealRequest` 또는 mutation 훅으로 분리. (4) **Presenter**: 테이블 껍데기(thead/컬럼), 날짜 탭, 빈 상태 메시지는 순수 Presenter; `renderCell`은 `MealGridCell` 컴포넌트로 추출해 `value`/`isPending`/`onChange`만 props로 받으면 경계 명확. (5) **RoomNoteInput**: 이미 분리된 서브 컴포넌트 유지 또는 `MealGridCell.tsx`와 함께 셀 단위 모듈로 이전 가능. 모달은 현재 파일에 없음(식단 요청만 API 직접 호출).

- [x] **Task 6: IVLabelPreviewModal 분리 리팩토링 실행**
  - **Tool**: `Edit` / `Write`
  - **Target**: `frontend/src/components/IVLabelPreviewModal.tsx` + `IVLabelMedSection.tsx` (신규)
  - **Goal**: Task 1 결과에 따른 서브 컴포넌트/유틸 추출 (1회 수정 범위: 한 덩어리만 분리)
  - **Pseudocode**: 상단/미리보기/라벨 블록을 별도 컴포넌트로 추출 후 import
  - **Dependency**: Task 1
  - **결과**: `IVLabelMedSection.tsx` 신규 생성 — `MixedMed` 타입, `addMed`/`updateMed`/`removeMed` 헬퍼, `MedSection` 컴포넌트 추출. 모달은 `formatMeds` 유지 후 `MedSection`/`MixedMed` import.

- [x] **Task 7: useVitals 분리 리팩토링 실행**
  - **Tool**: `Edit` / `Write`
  - **Target**: `frontend/src/hooks/useVitals.ts` + 필요 시 `useVitalsData.ts` 등
  - **Goal**: Task 2 결과에 따른 훅 분할 또는 헬퍼 모듈 추출 (1회에 한 단위만)
  - **Pseudocode**: 대시보드 fetch 로직을 별도 훅/함수로 분리 후 useVitals에서 호출
  - **Dependency**: Task 2

- [x] **Task 8: TemperatureGraph 분리 리팩토링 실행**
  - **Tool**: `Edit` / `Write`
  - **Target**: `frontend/src/components/TemperatureGraph.tsx` + 필요 시 `temperatureChartUtils.ts` 등
  - **Goal**: Task 3 결과에 따른 차트용 포맷/도메인 로직 유틸 파일로 추출
  - **Pseudocode**: 포맷/스케일 함수를 utils로 이동 후 import
  - **Dependency**: Task 3

- [x] **Task 9: useStation 분리 리팩토링 실행**
  - **Tool**: `Edit` / `Write`
  - **Target**: `frontend/src/hooks/useStation.ts` + `frontend/src/hooks/useStationDashboard.ts`
  - **Goal**: Task 4 결과에 따른 스테이션/대시보드 훅 분할 (1회에 한 단위)
  - **Pseudocode**: 대시보드 데이터 fetch를 별도 훅으로 분리 후 useStation에서 조합
  - **Dependency**: Task 4
  - **결과**: `useStationDashboard.ts` 신규 생성 — notifications, lastUploadedIv, lastUpdated 상태 + fetchPendingRequests, removeNotification. useStation은 해당 훅을 소비하고 handleMessage에서 setNotifications/setLastUploadedIv/setLastUpdated 사용.

- [x] **Task 10: MealGrid 분리 리팩토링 실행**
  - **Tool**: `Edit` / `Write`
  - **Target**: `frontend/src/components/MealGrid.tsx` + 필요 시 `MealGridCell.tsx` / 훅 분리
  - **Goal**: Task 5 결과에 따른 Presenter vs 로직 분리 (1회에 한 단위)
  - **Pseudocode**: 셀 렌더링 또는 요청 핸들러를 별도 컴포넌트/훅으로 추출
  - **Dependency**: Task 5
  - **결과**: `mealGridUtils.ts` 신규 생성 — `formatDate`, `formatDisplayDate`, `MEAL_TIMES`, `PEDIATRIC_OPTIONS`, `GUARDIAN_OPTIONS`, `getRoomNoteFromMatrix`, `getTargetMealTimeForNote`, `MealMatrix` 타입 추출. MealGrid.tsx는 해당 유틸 import로 교체하여 줄 수 감소.

- [x] **Task 11: 린트 및 타입 검증**
  - **Tool**: `Bash` (PowerShell 프로필 오류로 터미널 tsc 실패) → **ReadLints**로 `frontend/src` 검증
  - **Command**: `cd frontend && npx tsc --noEmit 2>&1 | Select-Object -First 50`
  - **Goal**: 분리 후 타입/린트 오류 0개 확인
  - **Dependency**: Task 6–10 중 실행한 항목
  - **결과**: `frontend/src` 기준 린트/타입 오류 0개 확인됨.

---

## 기술적 제약 및 규칙 (SSOT)

- **Encoding**: UTF-8 no BOM 고정.
- **Refactoring**: 기능 구현에 필수적이지 않은 스타일/이름 변경 금지. **한 번에 한 논리 단위만 분리**하여 회귀 최소화.
- **Environment**: Windows 11, frontend는 Node/tsc 기반 동작 보장.
- **CRITICAL_LOGIC §2.1**: 비즈니스 로직은 `hooks/`, 순수 Presenter는 `components/` 유지.

## Definition of Done

1. [x] 본 문서가 `docs/plans/`에 저장되어 300줄 이상 대상 목록이 단일 참조 문서로 확정됨.
2. [x] 선택된 Refactoring Task 수행 시 해당 파일이 300줄 미만으로 감소하거나, 책임이 명확히 분리됨.
3. [x] 수행 후 `npx tsc --noEmit` 및 프로젝트 린터 기준 오류 0개.
4. [x] 변경 반영 시 `memory.md`에 세션 요약 기록.
