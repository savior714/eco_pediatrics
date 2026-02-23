# Meal 관련 모듈 논리 전용 진단 및 수정 요약

> 프로토콜(`PROMPT_REFACTOR_LOGIC_ONLY_PROTOCOL.md`)에 따른 useMeals.ts / MealGrid.tsx 점검 결과.

---

## 1. 진단 결과 요약

| 항목 | useMeals.ts | MealGrid.tsx |
|------|-------------|--------------|
| API 반환값 접근 | `api.get` 반환값을 `data`로 직접 사용. `res.data` 미사용. | 동일. `res`로 직접 사용. |
| 비배열/빈 객체 처리 | **결함**: `setPlans(data \|\| [])` — `data`가 `{}`(100ms dedup)일 때 `\|\|`는 `{}`를 그대로 반환해 `setPlans({})` 호출됨. | **결함**: `res`가 `{}`일 때 `Array.isArray(res)` false인데도 그 아래에서 `setMatrix(map)` 호출 → 빈 map으로 상태 덮어씀. |
| 시퀀스 가드 | requestRef 증가 후 요청, 응답 시 currentRequestId 비교 후 early return. | 동일. |
| 100ms dedup 영향 | 동일 URL로 연속 호출 시 둘째가 `{}` 수신 가능 → 위 setPlans 결함으로 잘못된 상태 반영. | effect 재실행(activeDate/patients 변경)으로 동일 URL 재요청 시 `{}` 수신 가능 → setMatrix로 빈 그리드로 덮어씀. |

---

## 2. 적용한 수정 (Surgical Only)

### useMeals.ts

- 시퀀스 가드 통과 후 **`if (!Array.isArray(data)) return;`** 추가.
- **`setPlans(data || [])`** → **`setPlans(data)`** 로 변경. (배열임을 보장한 뒤에만 설정.)

### MealGrid.tsx

- 시퀀스 가드 통과 후 **`if (!Array.isArray(res)) return;`** 추가.
- 그 아래에서만 map 구성 및 **`setMatrix(map)`** 호출. 비배열 응답(빈 객체 등)일 때는 기존 matrix 상태 유지.

---

## 3. 호출 경로 (변경 없음)

- **useMeals.fetchPlans**: 상위에서 호출. 동일 구간 내 중복 호출 시 100ms dedup으로 한쪽이 `{}` 받을 수 있음 → 위 방어로 데이터 유실 방지.
- **MealGrid.fetchMatrix**: useEffect(activeDate, fetchMatrix), handleUpdate catch, Dev 일괄생성 버튼. WebSocket은 상위(스테이션)에서 처리되며 MealGrid는 props(beds)만 받음. effect가 재실행될 때만 동일 URL 중복 가능 → 위 방어로 빈 객체 반영 방지.

---

## 4. 시퀀스 가드 일관성

- 두 파일 모두 **요청 직전** `currentRequestId = ++requestRef.current` 부여, **응답 처리 직후** `currentRequestId !== requestRef.current`이면 return.
- 응답이 비배열/빈 객체인 경우 상태를 갱신하지 않도록 한 조건만 추가했으며, 가드 기준은 기존과 동일.
