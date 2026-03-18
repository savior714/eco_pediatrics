# Project Blueprint: 스테이션 대시보드 화이트 스크린 및 useStation 이중 호출 제거

> 생성 일시: 2026-03-19 | 상태: 구현 완료 (Task 1–3)

## Architectural Goal

- **문제 1**: dev 모드 실행 시 스테이션 대시보드가 하얗게만 보임. (최근 import 관련 수정 가능성 + 구조적 원인)
- **문제 2**: `useStation()`이 **두 군데**에서 호출되어 WebSocket 연결이 2개 생성됨. 백엔드가 토큰당 1개만 허용하면 두 번째 연결이 4003으로 끊기며 예기치 않은 상태 유발.
- **해결 방향**: Station 페이지에서는 `useStation()`을 **직접 호출하지 않고**, `connectionStatus`만 컨텍스트 등 단일 소스에서 가져오는 구조로 변경. `useStation()` 호출은 **트리 내 단일 지점**으로 제한.
- **SSOT 정렬**: `docs/CRITICAL_LOGIC.md` §2.1(훅으로 비즈니스 로직 추출), §2.2(WS 이벤트 처리·캐시 SSOT)와 충돌 없음. 단일 WS 연결로 정렬.

## Impact Scope (영향 범위)

| 수정 대상 파일 | 현재 라인 수 | 참조하는 파일 | 비고 |
| -------------- | :----------: | ------------- | ---- |
| `frontend/src/app/station/page.tsx` | 252 | (진입점) | useStation 제거, StationDataProvider 사용 |
| `frontend/src/hooks/useStationActions.ts` | 153 | `page.tsx`(StationInner) | useStation → useStationData(컨텍스트)로 교체 |
| `frontend/src/contexts/StationContext.tsx` | 67 | `page.tsx`, `useStationActions.ts` | 기존 유지. 신규 StationDataContext는 별도 파일 권장 |
| **신규** `frontend/src/contexts/StationDataContext.tsx` | ~50 예상 | `page.tsx`, `useStationActions.ts` | useStation 단일 호출 + Provider 제공 |

## Step-by-Step Execution Plan

> 아래 목록은 **독립적인 기능 단위**로 설계되었습니다. Task 2는 Task 1에 의존하므로 순서대로 진행할 것.

### Task List

- [x] **Task 1: StationDataContext 신규 생성 — useStation 단일 호출 및 공급**
  - **Action**: 파일 생성
  - **Target**: `frontend/src/contexts/StationDataContext.tsx`
  - **Goal**: `useStation()`을 **한 번만** 호출하는 Provider 컴포넌트와, 해당 값을 구독하는 `useStationData()` 훅을 제공한다. Station 페이지는 이 Provider 하위에서만 `connectionStatus`/`beds` 등을 사용한다.
  - **Pseudocode**:
    - `createContext<ReturnType<typeof useStation> | null>(null)` (useStation.ts에서 타입 export 없이 사용)
    - `StationDataProvider({ children })`: `const value = useStation(); return <Context.Provider value={value}>{children}</Context.Provider>`
    - `useStationData()`: `useContext` 반환, null이면 throw (StationProvider와 동일 패턴)
  - **Verify**: 새 파일이 존재하며, `useStation`을 1회만 import·호출하고, `useStationData()`가 타입상 `UseStationReturn`을 반환함.
  - **Dependency**: None

- [x] **Task 2: station/page.tsx — useStation 제거, StationDataProvider로 래핑**
  - **Action**: 파일 수정
  - **Target**: `frontend/src/app/station/page.tsx`
  - **Goal**: `Station()` 컴포넌트에서 `useStation()` 호출을 제거하고, `StationDataProvider` 하위에서 `beds`/`connectionStatus`를 컨텍스트에서 읽어 `StationProvider`와 `StationInner`에 전달한다.
  - **Pseudocode**:
    - `Station()`: `return <ErrorBoundary><StationDataProvider><StationWithBedsAndStatus /></StationDataProvider></ErrorBoundary>`
    - 내부 컴포넌트(이름 예: `StationWithBedsAndStatus`)에서 `const { beds, connectionStatus } = useStationData();` 후 기존처럼 `<StationProvider beds={beds}><StationInner connectionStatus={connectionStatus} /></StationProvider>`
  - **Verify**: `page.tsx` 내에 `useStation()` 호출이 0회이며, `useStationData`는 `StationDataProvider` 자식 내부에서만 호출됨.
  - **Dependency**: Task 1

- [x] **Task 3: useStationActions.ts — useStation 대신 useStationData 사용**
  - **Action**: 파일 수정
  - **Target**: `frontend/src/hooks/useStationActions.ts`
  - **Goal**: `useStation()` 호출을 `useStationData()`로 교체하여, 스테이션 데이터가 항상 상위 `StationDataProvider`의 단일 `useStation()` 결과만 참조하도록 한다.
  - **Pseudocode**: `const stationData = useStation();` → `const stationData = useStationData();` (import는 `@/contexts/StationDataContext`에서 `useStationData`)
  - **Verify**: `useStationActions` 내부에 `useStation` import/호출이 없고, `useStationData`만 사용됨. 훅 사용처(StationInner)는 이미 `StationDataProvider` 하위이므로 동작 유지.
  - **Dependency**: Task 1

- [ ] **Task 4: (선택) 브라우저 콘솔 에러 확인 및 추가 수정**
  - **Action**: 사용자 확인
  - **Target**: 브라우저 F12 → Console
  - **Goal**: 화이트 스크린의 1차 원인이 import/런타임 에러인 경우, 콘솔 메시지를 기반으로 추가 수정(import 경로, 타입 등) 진행.
  - **Verify**: 스테이션 페이지 로드 시 콘솔에 빨간 에러 없음, 화면이 그리드/헤더와 함께 정상 렌더링됨.
  - **Dependency**: Task 2, 3 완료 후

---

## 기술적 제약 및 참고

- **Encoding**: UTF-8 no BOM.
- **CRITICAL_LOGIC §2.9**: Domain Type SSOT — 훅/컨텍스트에서 사용하는 타입은 `UseStationReturn` 등 기존 `useStation.ts` 정의를 재사용하며, 필요 시 해당 타입을 `domain.ts` 또는 훅 파일에서 export만 하면 됨.
- **Node 프로세스 폭증**: 화이트 스크린과 별개. `eco.bat dev` 중복 실행 시 Node 다수 생성됨. 즉시 해결: `taskkill /F /IM node.exe` 후 `eco.bat dev` 1회만 실행.

## Definition of Done

1. [ ] `useStation()`이 앱 전체에서 **StationDataProvider 내부 1회**만 호출됨.
2. [ ] `page.tsx`에 `useStation` import/호출 없음. `useStationActions`는 `useStationData`만 사용.
3. [ ] 타입 체크 및 린트 오류 Zero. (`npx tsc --noEmit --skipLibCheck` 등)
4. [ ] (가능 시) 브라우저 콘솔 에러 없이 스테이션 대시보드가 정상 렌더링됨.
5. [ ] `docs/memory.md` 또는 관련 SSOT에 “스테이션 단일 useStation 구조” 반영.
