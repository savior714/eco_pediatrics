# [Logic-Only Refactoring] 맞춤형 진단·수정 프롬프트 모음

> 아래 각 섹션을 **개별 LLM/에이전트 요청**에 복사해 사용하세요.  
> 공통 전제: `PROMPT_REFACTOR_LOGIC_ONLY_PROTOCOL.md`, `PROMPT_REFACTOR_AREAS_AND_CHECKLIST.md`, `docs/CRITICAL_LOGIC.md` 준수. 구조·스타일 변경 금지.

---

## 상태 안내

| 대상 | 상태 | 참고 문서 |
|------|------|-----------|
| useMeals.ts, MealGrid.tsx | **진단·수정 완료** | `DIAGNOSIS_MEAL_MODULES_LOGIC.md` |
| useDashboardStats.ts | 미진단 | 아래 §2 프롬프트 사용 |
| PatientDetailModal.tsx | 미진단 | 아래 §3 프롬프트 사용 |
| dashboard/page.tsx | 미진단 | 아래 §4 프롬프트 사용 |

---

## 1. useMeals.ts & MealGrid.tsx (식단 관리 통합 진단)

**※ 이미 진단·수정 적용됨. 재검토 시에만 사용.**

프로토콜에 따라 `useMeals.ts`와 `MealGrid.tsx` 사이의 **데이터 정합성 논리**를 진단하고 수정하세요.

- **대상**: `frontend/src/hooks/useMeals.ts`, `frontend/src/components/MealGrid.tsx`
- **핵심 진단 포인트**:
  1. **상태 불일치**: `useMeals`의 `plans`와 `MealGrid`의 `matrix`가 각각 `fetchPlans`/`fetchMatrix`로 갱신될 때, 한쪽만 성공하거나 시퀀스가 뒤처져 엉뚱한 날짜/데이터가 표시되는 경우가 있는지 확인.
  2. **API 응답 구조**: `api.get<T>`가 body를 직접 반환함을 전제로, 응답 처리부에서 `.data` 접근 오류나 `Array.isArray` 체크 누락으로 인한 조용한 실패(Silent Failure)가 없는지 전수 조사.
  3. **중복 호출 방어**: 초기 마운트·effect 재실행 시 동일 URL로 연속 요청이 나갈 때, 100ms 디덱으로 빈 응답(`{}`)이 와도 상태를 덮어쓰지 않도록 가드가 있는지 점검.

**지시**: **연쇄적 갱신 실패**를 막는 최소한의 가드만 추가하세요. UI·컴포넌트 구조는 건드리지 마세요.

---

## 2. useDashboardStats.ts (상단 대시보드 통계)

**[Logic-Only Refactoring 요청: useDashboardStats.ts]**

프로토콜에 정의된 원칙에 따라 대시보드 상단 통계 수집 로직의 **논리적 완결성**을 검토하세요.

- **대상**: `frontend/src/hooks/useDashboardStats.ts`
- **핵심 진단 포인트**:
  1. **필터링 로직**: 시간 범위나 스테이션 필터 변경 시 호출되는 fetch가 `requestRef`(또는 동등한 시퀀스 가드)를 통해 **최신 요청만** 반영하는지 확인.
  2. **Zero-Value 처리**: API 응답이 없거나 빈 배열일 때, 대시보드 수치가 `NaN`·`undefined`로 깨지지 않고 **0 또는 기본값**을 유지하도록 하는 논리적 기본값(Fallbacks)이 적절한 위치에 있는지 점검.
  3. **순환 호출 방어**: 통계 fetch가 다른 상태 변경을 일으키고, 그 상태가 다시 fetch를 부르는 **무한 루프** 가능성이 없는지. `useMemo`·`useCallback`·`useEffect` 의존성 배열을 논리적으로 검토.

**지시**: 복잡한 추상화 없이 **데이터 흐름의 단방향성과 안정성**을 보장하는 수정만 진행하세요.

---

## 3. PatientDetailModal.tsx (데이터 바인딩 논리)

**[Logic-Only Refactoring 요청: PatientDetailModal.tsx]**

이 모듈에서는 **데이터 바인딩 및 초기화 논리**만 진단합니다.

- **대상**: `frontend/src/components/PatientDetailModal.tsx`
- **핵심 진단 포인트**:
  1. **ID 불일치 방어**: 모달이 열릴 때 전달받은 `patientId`(또는 admissionId)와 실제 fetch한 데이터의 ID가 일치하는지 검증하는 로직이 있는가? (다른 환자 데이터 표시 방지)
  2. **Cleanup 논리**: 모달이 닫힐 때 내부 로컬 상태나 비동기 요청을 적절히 초기화(cancel 또는 ignore)하여, 재오픈 시 **이전 환자 데이터가 잠깐 보이는 잔상**이 없는지 점검.
  3. **수정 후 동기화**: 모달 내에서 데이터 수정(저장) 성공 후, 부모 목록(`useStation` 등)을 리프레시하는 트리거가 유실 없이 작동하는지 확인.

**지시**: 레이아웃·CSS 수정은 하지 마세요. **환자 데이터가 정확히 매핑·동기화되는 논리**만 보강하세요.

---

## 4. dashboard/page.tsx (페이지 진입점 논리)

**[Logic-Only Refactoring 요청: dashboard/page.tsx]**

페이지 레벨에서의 **초기 로드 시퀀스 및 에러 경계 논리**를 점검하세요.

- **대상**: `frontend/src/app/dashboard/page.tsx`
- **핵심 진단 포인트**:
  1. **권한 가드**: 토큰이 없거나 만료된 상태에서 각 훅이 실행되어 **불필요한 401/403**을 반복 호출하고 있지는 않은지. 진입점에서의 얼리 리턴(Early Return) 또는 `enabled` 조건이 논리적으로 타당한지 점검.
  2. **훅 배치 순서**: 상태 공유가 필요한 훅들 사이에서 **초기화 순서**가 타당한지(예: 스테이션/입원 정보가 먼저 와야 바이탈을 그릴 수 있는가) 검토.
  3. **에러 마스킹**: 특정 훅에서 에러가 났을 때 **전체 대시보드가 화이트아웃**되지 않고, 해당 섹션만 폴백 처리되도록 하는 논리적 구조가 있는지 확인.

**지시**: 대규모 컴포넌트 분리는 하지 마세요. **페이지 마운트 시점의 안정성**을 확보하는 논리 수정에만 집중하세요.

---

## 사용 방법

- **단일 모듈**: 위 §2~§4 중 해당 섹션만 복사해 에이전트에 붙여넣고, "진단 보고서를 먼저 작성한 뒤 수정안을 제안해줘"라고 요청.
- **일괄 진단**: "§2, §3, §4 각각에 대해 진단만 수행하고, 결과를 파일별로 `DIAGNOSIS_<모듈명>_LOGIC.md` 형식으로 정리해줘"라고 요청한 뒤, 검토 후 수정 지시를 내리는 방식을 권장.

---

## 에이전트 결과물 검증

진단 보고서 또는 수정 PR을 컨펌할 때는 **`REFACTOR_AUDITOR_GUIDE.md`**를 사용하세요.

- **아키텍트 검토 포인트**: requestRef 증가 시점, 잔상(ghosting) 방지, 페이지 진입점 권한·의존성.
- **Master Auditor 3필터**: Surgical Check / Logic Consistency / Style Preservation.
