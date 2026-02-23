# 진단 보고서: dashboard/page.tsx (Logic-Only)

**대상**: `frontend/src/app/dashboard/page.tsx`  
**기준**: `PROMPT_REFACTOR_LOGIC_ONLY_PROTOCOL.md`, `PROMPT_LOGIC_ONLY_REFACTOR_BATCH.md` §4, `REFACTOR_AUDITOR_GUIDE.md` §1.3

---

## 1. 요약

- **권한 가드**: 타당함. 토큰 없을 때 불필요한 API 호출 없음.
- **훅 배치 순서**: 단일 데이터 소스(useDashboardStats → useVitals)이며, 스테이션 선행 로드가 필요 없는 구조라 문제 없음.
- **에러 마스킹**: 훅 단에서 throw 없이 처리하나, **섹션 단위 Error Boundary는 없음.** 필요 시 최소한의 래핑만 권장.

**필수 논리 수정**: 없음. 선택적으로 에러 경계 추가 가능.

---

## 2. 진단 포인트별 결론

### 2.1 권한 가드 (Early Return / enabled)

- **페이지**: `DashboardContent`에서 `useDashboardStats()` 호출 후 `if (!token) return (... 잘못된 접근 ...)` 로 얼리 리턴.
- **useDashboardStats**: `token = searchParams.get('token')` 후 `useVitals(token, true, onDischarge)` 호출. `enabled`는 항상 `true`이므로, **실제 가드는 useVitals 내부의 token 검사**에 의존.
- **useVitals** (직접 확인):
  - 초기 fetch용 `useEffect`: `if (!token || !enabled) { ... return; }` → **token 없으면 fetch 미호출.**
  - `fetchDashboardData`: `if (!token) return;` → 내부에서도 이중 방어.
  - WebSocket: `enabled: !!token && enabled` → 토큰 없으면 WS 미연결.
- **결론**: 토큰이 없거나 만료된 상태에서 **불필요한 401/403 반복 호출은 발생하지 않음.** 진입점 얼리 리턴과 useVitals의 token/enabled 조건이 논리적으로 타당함.

### 2.2 훅 배치 순서 (초기화 순서)

- **구조**: 이 페이지는 **단일 진입 데이터 소스**만 사용함.  
  `DashboardContent` → `useDashboardStats()` → `useVitals(token, true, onDischarge)`.  
  스테이션 목록·입원 목록을 먼저 불러와야 하는 구조가 아님. 토큰 하나로 대시보드 API 1회 호출.
- **결론**: 스테이션/입원 정보 선행 로드가 필요 없는 페이지이므로, 훅 배치 순서로 인한 404 또는 잘못된 초기화 이슈는 없음.

### 2.3 에러 마스킹 (화이트아웃 방지)

- **현재**:
  - useVitals의 `fetchDashboardData`는 try/catch로 감싸져 있으며, 403/404/토큰 만료 시 `tokenInvalidatedRef` 설정 후 `onDischarge()` 호출. **훅이 예외를 다시 throw하지 않음.**
  - 반면 **자식 컴포넌트**(TemperatureGraph, IVStatusCard, 식단/서류/검사 섹션 등)에서 렌더 중 예외가 나면, 상위에 Error Boundary가 없어 **전체 대시보드가 React 기본 에러 화면(화이트아웃)으로 대체될 수 있음.**
- **결론**:  
  - “특정 훅에서 에러” 자체는 useVitals에서 처리되어 화이트아웃 원인이 되지 않음.  
  - “특정 **섹션**에서 에러 시 해당 섹션만 폴백”하는 구조(Error Boundary로 섹션 격리)는 **현재 없음.**  
  - 프로토콜상 “대규모 컴포넌트 분리 금지”를 지키면서, **페이지 마운트 시점 안정성**만 놓고 보면: 훅 레벨 논리 결함은 없고, 섹션 단위 에러 격리는 **선택적 개선**으로 두는 것이 타당함. 필요 시 `<DashboardContent>` 전체를 하나의 Error Boundary로 한 번만 감싸는 최소 래핑을 권장할 수 있음.

---

## 3. Master Auditor 체크 (참고)

| 필터 | 결과 |
|------|------|
| Surgical Check | 수정 제안 없음(선택적 Error Boundary 제외). |
| Logic Consistency | useVitals의 token/enabled·requestRef 패턴과 충돌 없음. |
| Style Preservation | 변경 없음. |

---

## 4. 정리

- **필수 수정**: 없음.
- **선택 사항**:  
  - 자식 컴포넌트 예외 시 전체 화면 깨짐을 막고 싶다면, `DashboardContent`를 한 겹 Error Boundary로 감싸고 fallback UI(예: “일부 내용을 불러오지 못했습니다”)만 노출하는 정도의 **최소 래핑**을 고려할 수 있음.  
  - 이는 “논리적 결함 제거”보다 “안정성 보강”에 가깝고, 프로토콜상 생략해도 무방함.
