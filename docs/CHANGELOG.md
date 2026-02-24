# 문서·워크플로우 변경 이력

## 2026-02-24

### 스테이션 렌더링 최적화 및 PatientDetailModal 타입 수정

- **TemperatureGraph**  
  - `frontend/src/components/TemperatureGraph.tsx`: 커스텀 비교 함수에서 `data` 배열을 **역순(최신→과거)** 으로 순회해 동일 여부 판별. `memo(TemperatureGraphBase, arePropsEqual)` 유지.
- **MealGrid**  
  - `frontend/src/components/MealGrid.tsx`: `areMealGridPropsEqual` 추가 — `beds.length` 및 각 bed의 `id`, `token`만 비교. `memo(MealGridBase, areMealGridPropsEqual)`. `RoomNoteInput`의 `value={localNote ?? ''}` 로 제어 컴포넌트 경고 제거.
- **NotificationItem 분리**  
  - `frontend/src/components/NotificationItem.tsx` 신규: 알림 항목을 개별 컴포넌트로 분리하고 `memo` 적용. 새 알림 추가 시 기존 항목 리렌더 방지.
  - `frontend/src/app/station/page.tsx`: 알림 리스트를 `NotificationItem` 사용으로 교체.
- **PatientDetailModal**  
  - `onCompleteRequest` 타입을 `(...) => void | Promise<void>` 로 변경해 `removeNotification` 반환 Promise에 `.then()` 사용 가능하도록 수정.

**상세:** `docs/FRONTEND_RENDER_OPTIMIZATION.md` 참조.

**수정·반영된 파일**

| 대상 | 내용 |
|------|------|
| `frontend/src/components/TemperatureGraph.tsx` | 역순 순회 비교 유지, memo+arePropsEqual |
| `frontend/src/components/MealGrid.tsx` | areMealGridPropsEqual, memo(MealGridBase), RoomNoteInput value 폴백 |
| `frontend/src/components/NotificationItem.tsx` | 신규 — memo(NotificationItem) |
| `frontend/src/app/station/page.tsx` | NotificationItem 사용으로 알림 map 교체 |
| `frontend/src/components/PatientDetailModal.tsx` | onCompleteRequest 반환 타입 void \| Promise<void> |

---

## 2026-02-23

### 스테이션 대시보드·식단 비고·그리드 애니메이션

- **스테이션 원장 필터 및 입원 카운터**  
  - `frontend/src/app/station/page.tsx`: 원장 이니셜(조/김/원/이) 토글 필터, `총 입원 : {activeCount} / {beds.length}` 동적 표시, `displayBeds` 기반 그리드 필터링.
- **식단 비고 전실 후 유실 방지**  
  - `frontend/src/components/MealGrid.tsx`: 비고 입력을 비제어(`defaultValue`)에서 제어 컴포넌트(`RoomNoteInput`)로 변경. LUNCH/BREAKFAST/DINNER 폴백으로 비고 읽기, 저장 시 존재하는 식단 시간대에 기록(없으면 LUNCH).
- **그리드 레이아웃 모핑 애니메이션**  
  - `frontend/src/app/station/page.tsx`: `framer-motion` 도입, `AnimatePresence mode="popLayout"` + `motion.div`의 `layout`/`initial`/`animate`/`exit`로 필터 시 카드 등장·퇴장·슬라이딩 재배치 적용.

**수정·반영된 파일**

| 대상 | 내용 |
|------|------|
| `frontend/src/app/station/page.tsx` | `filterPhysician` 상태, `activeCount`/`displayBeds`, 원장 필터 버튼, `framer-motion`(AnimatePresence·motion.div) |
| `frontend/src/components/MealGrid.tsx` | `RoomNoteInput` 제어 컴포넌트, `getRoomNoteFromMatrix`/`getTargetMealTimeForNote`, LUNCH/BREAKFAST/DINNER 폴백 |
| `frontend/package.json` | `framer-motion` 의존성 추가 |

---

## 2025-02-23

### repomix 출력 통합 — 한 파일만 사용

- **변경 요약**: repomix는 **`docs/repomix-output.md` 한 파일만** 생성·사용하도록 통일. 백엔드/프론트 분리 옵션 제거.
- **사용 방식**: 같은 파일을 붙여넣고 **백엔드(Step 1)** 먼저 물어본 뒤, 같은 파일 다시 붙여넣고 **프론트(Step 2)** 따로 물어보는 흐름만 유지.

**수정·반영된 파일**

| 대상 | 내용 |
|------|------|
| `scripts/Invoke-Repomix.ps1` | 출력을 `docs/repomix-output.md` 한 개만 생성 (이미 반영됨) |
| `docs/prompts/WORKFLOW_30MIN_PROMPTS.md` | 경로/생성/용도를 repomix-output.md 한 파일만 쓰도록 수정. Phase 0·기능별 더 줄이기·백/프론트 분리 설명 제거. Phase 1은 같은 파일 붙여넣고 Step 1 → Step 2 순서로 문구 정리 |
| `docs/WORKFLOW_30MIN_AI_CODING.md` | 전제·섹션 0·Phase 1을 통합 한 파일 기준으로 수정. 두/세 파일 생성 문구 제거, 표·정리에서 repomix-output.md만 유지 |
| `.gitignore` | `docs/repomix-backend.md`, `docs/repomix-frontend.md` 항목 제거 (미생성 파일) |

**참고**: `docs/repomix-output.md`는 `.gitignore`에 포함되어 있어 로컬에서만 생성·사용되며 커밋되지 않음.
