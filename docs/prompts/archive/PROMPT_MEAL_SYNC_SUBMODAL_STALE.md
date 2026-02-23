# 식단 일괄 생성 후 서브모달 데이터 미갱신 디버깅 프롬프트

## 문제 요약

**증상**: 식단 일괄 관리 UI에서 DEV 버튼("식단 일괄 생성")으로 일괄 데이터를 생성한 뒤, 표(테이블)에는 데이터가 정상 표시되지만, **환자 개별 서브모달(PatientDetailModal)**에서 조회하면 해당 데이터가 갱신되어 있지 않음.

**재현 절차**:
1. 스테이션 페이지(`/station`)에서 **식단 관리** 탭으로 이동
2. **식단 일괄 생성 (Dev)** 버튼 클릭
3. 표(테이블)에 아침/점심/저녁 식단 데이터가 정상 표시됨
4. **환자 리스트** 탭으로 전환 후 환자 카드 클릭 → 환자 개별 서브모달(PatientDetailModal) 열기
5. 서브모달 내 식단 영역(오늘 아침/점심/저녁)에서 1단계에서 생성한 데이터가 **표시되지 않음** (또는 이전 상태로 남아 있음)

---

## 기술 스택 및 데이터 소스

| 구분 | 데이터 소스 | API | 관련 파일 |
|------|-------------|-----|-----------|
| **식단 일괄 관리 표(MealGrid)** | `GET /api/v1/meals/matrix?target_date=YYYY-MM-DD` | `meal_service.get_meal_matrix()` | `frontend/MealGrid.tsx`, `backend/services/meal_service.py` |
| **환자 서브모달(PatientDetailModal)** | `GET /api/v1/dashboard/{token}` | `services/dashboard.fetch_dashboard_data()` | `frontend/PatientDetailModal.tsx`, `frontend/hooks/useVitals.ts`, `backend/services/dashboard.py` |

- MealGrid: `meal_requests` 테이블에서 `meal_date = target_date` 조건으로 조회
- Dashboard: `meal_requests` 테이블에서 `admission_id = {해당 입원ID}` 조건으로 조회 (날짜 무관, `meal_date` 내림차순, limit 50)

---

## 예상 원인 후보

1. **갱신 시점 불일치**  
   - MealGrid는 seed 완료 후 `fetchMatrix()`를 명시적으로 호출함  
   - PatientDetailModal은 `useVitals` → `fetchDashboardData()`를 **모달이 열릴 때만** 호출  
   - 모달이 이미 열린 상태에서 seed를 수행한 경우, 서브모달은 재조회하지 않을 수 있음

2. **WebSocket 미브로드캐스트**  
   - `POST /api/v1/dev/seed-meals` (dev_service.seed_all_meals)가 WebSocket으로 `NEW_MEAL_REQUEST` 또는 `MEAL_UPDATED`를 브로드캐스트하지 않을 가능성  
   - useVitals는 WebSocket 메시지 수신 시 `debouncedRefetch`로 갱신하는데, seed 시점에 해당 이벤트가 없으면 갱신되지 않음

3. **lastFetchRef 쓰로틀(500ms)**  
   - `useVitals`의 `fetchDashboardData`에 `lastFetchRef` 기반 500ms 쓰로틀 존재  
   - 모달을 연 직후 seed → 다시 모달로 돌아오는 흐름에서 쓰로틀에 걸려 fetch가 스킵될 수 있음

4. **선택된 bed/모달 상태**  
   - `selectedBed`가 유지된 채로 탭만 "식단 관리" ↔ "환자 리스트" 전환 시, 모달이 닫히지 않았을 수 있음  
   - 모달이 이미 열린 상태에서는 `useEffect([isOpen, bed?.token, fetchDashboardData])`가 재실행되지 않아 갱신 누락 가능

---

## 조사 및 수정 요청

1. **seed-meals 브로드캐스트 여부 확인**  
   - `backend/services/dev_service.py`의 `seed_all_meals()` 내부에서 WebSocket 브로드캐스트 호출 여부 확인  
   - 없다면, seed 완료 후 관련 admission별로 `NEW_MEAL_REQUEST` 또는 유사 이벤트를 브로드캐스트하도록 추가 검토

2. **PatientDetailModal / useVitals 갱신 트리거**  
   - 모달이 이미 열린 상태에서 MealGrid에서 seed가 완료된 뒤, 사용자가 다시 환자 카드를 클릭할 때 `fetchDashboardData`가 호출되는지 확인  
   - 필요 시: MealGrid의 seed 성공 콜백에서 전역/부모 상태를 갱신하거나, 서브모달 쪽에서 "식단 관리 탭에서 seed 완료" 이벤트를 구독해 `fetchDashboardData`를 호출하는 방안 검토

3. **쓰로틀/재호출 로직 점검**  
   - seed 직후 서브모달로 전환 시 `lastFetchRef` 쓰로틀로 인해 fetch가 막히는지 확인  
   - 필요 시 seed 완료 후 서브모달용 데이터 갱신 시에는 쓰로틀을 우회하거나, 명시적 `refetch` 호출 경로 추가 검토

---

## 관련 파일 목록

- `frontend/src/components/MealGrid.tsx` — 식단 일괄 생성 버튼, `fetchMatrix()` 호출
- `frontend/src/components/PatientDetailModal.tsx` — 환자 서브모달, `useVitals` 사용
- `frontend/src/hooks/useVitals.ts` — `fetchDashboardData`, WebSocket, 쓰로틀 로직
- `frontend/src/hooks/useStationActions.ts` — `activeTab`, `selectedBed` 상태
- `frontend/src/app/station/page.tsx` — MealGrid / PatientDetailModal 렌더링
- `backend/services/dev_service.py` — `seed_all_meals()`
- `backend/services/dashboard.py` — `fetch_dashboard_data()`, meals 쿼리
- `backend/services/meal_service.py` — `get_meal_matrix()`

---

## SSOT 및 규칙

- `docs/CRITICAL_LOGIC.md` §2.2: WebSocket 브로드캐스트는 '트리거' 역할, 실제 갱신은 클라이언트의 명시적 Refetch로 수행
- `docs/CRITICAL_LOGIC.md` §2.2: 모든 API 호출 훅에 최소 500ms `lastFetchRef` 가드 적용

위 정보를 바탕으로 원인을 분석하고, **최소한의 수정으로** 서브모달에서 식단 일괄 생성 후 데이터가 정상 갱신되도록 수정 방안을 제안해 주세요.
