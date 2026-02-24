# 프론트엔드 렌더링 최적화 (2026-02-24)

스테이션 페이지에서 웹소켓·상태 갱신 시 불필요한 리렌더를 줄이기 위해 적용한 메모이제이션 및 컴포넌트 분리 정책.

---

## 1. TemperatureGraph

**파일:** `frontend/src/components/TemperatureGraph.tsx`

- **목표:** `data` 배열이 동일하면 리렌더 차단.
- **방법:** 커스텀 비교 함수 `arePropsEqual`에서 `checkInAt`, `className`, `data.length` 비교 후, **최신 데이터(배열 끝)부터 역순**으로 각 항목 비교.
- **비교 필드:** `recorded_at`, `temperature`, `has_medication`, `medication_type`, `isOptimistic`.
- **Export:** `memo(TemperatureGraphBase, arePropsEqual)`.

---

## 2. MealGrid

**파일:** `frontend/src/components/MealGrid.tsx`

- **목표:** 식단 매트릭스는 내부 상태로 관리되므로, 부모가 넘기는 `beds`의 **구조적 변동(입퇴원·이동)** 만 감지.
- **방법:** `areMealGridPropsEqual`에서 `beds.length`와 각 bed의 **`id`, `token`** 만 비교.
- **Export:** `memo(MealGridBase, areMealGridPropsEqual)`.
- **기타:** `RoomNoteInput`의 `value={localNote ?? ''}` 로 제어 컴포넌트 경고 제거.

---

## 3. NotificationItem (알림 리스트 분리)

**파일:**  
- `frontend/src/components/NotificationItem.tsx` (신규)  
- `frontend/src/app/station/page.tsx`

- **목표:** 인라인 `map`으로 그리던 알림을 개별 컴포넌트로 분리해, **새 알림 추가 시 기존 알림 항목이 리렌더되지 않도록** 함.
- **구현:** `NotificationItem`을 `memo`로 감싸고, `notification`·`onClick`만 props로 전달. 부모의 `handleNotificationClick`은 `useStationActions`의 `useCallback`으로 안정화됨.
- **사용:** `notifications.map(notif => <NotificationItem key={notif.id} notification={notif} onClick={handleNotificationClick} />)`.

---

## 4. PatientDetailModal 타입 수정

**파일:** `frontend/src/components/PatientDetailModal.tsx`

- **문제:** `onCompleteRequest`가 `(...) => void`로만 정의되어 있어, 실제로 `Promise`를 반환하는 `removeNotification` 호출 결과에 `.then()`을 쓰면 타입 에러(`Property 'then' does not exist on type 'never'`).
- **수정:** `onCompleteRequest` 시그니처를  
  `(id: string, type?: string, admissionId?: string) => void | Promise<void>`  
  로 변경.

---

## 검증

- `npm run build` 로 TypeScript·Next 빌드 통과 확인.
- React DevTools Profiler로 웹소켓 갱신 시 TemperatureGraph / MealGrid / NotificationItem 리렌더 감소 여부 확인 권장.
