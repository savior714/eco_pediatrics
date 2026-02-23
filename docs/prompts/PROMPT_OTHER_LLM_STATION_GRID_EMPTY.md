# [다른 LLM용] 스테이션 첫 화면 그리드 비어 있음 — 상세 디버깅 프롬프트

> **사용법**: 아래 "---" 구간부터 끝까지 전부 복사해 Claude, GPT, 기타 LLM에 붙여 넣고,  
> **근본 원인 특정** 및 **최소 변경 수정안**을 요청하세요.

---

## 역할

당신은 프론트엔드/풀스택 디버깅 전문가입니다. Next.js + FastAPI 앱에서 **앱 구동 직후 첫 화면에서 입원 환자 그리드가 비어 있는** 문제의 근본 원인을 찾고, 스로틀·시퀀스 가드·WebSocket 리싱크를 깨지 않는 **최소 수정**으로 해결안을 제시해 주세요.

---

## 1. 현상 (재현 방법)

- **앱**: Eco-Pediatrics Station Control. Next.js(App Router) 프론트엔드, FastAPI 백엔드, 개발 모드.
- **화면**: 스테이션 페이지 "환자 리스트" 탭. 방별 카드 그리드(301, 302, … 402-4 등 30개). 각 카드는 환자 정보(이름, 체온, 수액 등) 또는 빈 슬롯(방 번호 + "입원" 버튼)으로 표시됨.

### 증상 A — 최초 로드 시 그리드가 비어 있음 (미해결)

1. 백엔드(uvicorn)와 프론트(Next.js dev)를 띄운 뒤, **브라우저에서 스테이션 페이지를 처음 연다** (또는 새로고침).
2. 백엔드 DB에는 이미 입원 환자가 있음.
3. **실제**: 모든 카드가 빈 슬롯처럼 보임(방 번호 + "입원" 버튼만 있고, 환자명·체온 등 없음).
4. **"DEV: 환자추가"** 버튼을 한 번 누르면, 그제서야 **한 번에** 실제 환자 데이터가 반영된 카드로 렌더링됨.
5. 이미 시도한 수정: `fetchAdmissions(force?: boolean)` 도입, `useEffect`에서 `fetchAdmissions(true)`로 초기 1회 스로틀 무시. **현상은 그대로.**

### 증상 B — 퇴원 후 그리드가 다시 비어 있음

- 한 명 퇴원(상세 → 퇴원 버튼 → 확인) 후 API 성공 시 `window.location.reload()` 호출.
- 재로드된 스테이션 페이지에서 다시 **그리드가 텅 빈 상태** (증상 A와 동일).

### 기대 동작

- 최초 로드 및 reload 시 `GET /api/v1/admissions` 응답이 오면, 그 결과로 카드가 채워져야 함.
- 퇴원 후 reload가 있더라도, 재로드된 페이지에서 동일 API로 남은 입원 목록이 그리드에 표시되어야 함.

---

## 2. 기술 스택 및 데이터 흐름 요약

- **스테이션 페이지**: `frontend/src/app/station/page.tsx`. `useStationActions()` → 내부에서 `useStation()`. `beds` 상태를 그리드에 매핑해 렌더링.
- **데이터 소스**: `frontend/src/hooks/useStation.ts`
  - `beds`: `fetchAdmissions()` 안에서 `api.get<AdmissionSummary[]>('/api/v1/admissions')` 호출 후, 응답으로 `setBeds(newBeds)` 호출해 갱신.
  - **스로틀**: `fetchAdmissions(force = false)`. `force`가 아니면 `lastFetchRef` 기준 **500ms** 내 재호출 시 아예 API를 타지 않고 return.
  - **시퀀스 가드**: 요청 시 `currentRequestId = ++requestRef.current` 할당. 응답 도착 시 `currentRequestId !== requestRef.current`이면 `setBeds` 하지 않고 무시(오래된 응답으로 간주).
  - **초기 로드**: `useEffect`에서 (1) 빈 슬롯으로 `setBeds(ROOM_NUMBERS.map(...))` 초기화, (2) `fetchAdmissions(true)`, (3) `fetchPendingRequests()` 호출.
  - **WebSocket**: `useWebSocket`의 `onOpen`에서 `initialLoadDoneRef.current`가 true일 때만 `fetchAdmissions()` 호출(초기 연결 시에는 호출 안 함). `ADMISSION_DISCHARGED` / `ADMISSION_TRANSFERRED` 수신 시에도 `fetchAdmissions()` 호출.
- **API 클라이언트**: `frontend/src/lib/api.ts`
  - **GET 요청 100ms 디바운스**: 동일 URL이 **100ms 이내**에 다시 요청되면 **실제 fetch 없이 `Promise.resolve({} as T)`** 반환. (중복 요청 방지 목적.)

---

## 3. 핵심 코드 (그대로 참고용)

### 3.1 useStation.ts — fetchAdmissions 및 초기 effect

```ts
// Throttle refs
const lastFetchRef = useRef<number>(0);
const requestRef = useRef(0);
const initialLoadDoneRef = useRef(false);

const fetchAdmissions = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 500) return;
    lastFetchRef.current = now;

    const currentRequestId = ++requestRef.current;
    api.get<AdmissionSummary[]>('/api/v1/admissions')
        .then(admissions => {
            if (currentRequestId !== requestRef.current) {
                console.warn(`[fetchAdmissions] 오래된 응답 무시됨. reqId: ${currentRequestId}`);
                return;
            }
            if (!Array.isArray(admissions)) return;  // ← 빈 객체 {}가 오면 여기서 return, setBeds 호출 안 함

            const newBeds = ROOM_NUMBERS.map(...); // admissions 기반으로 beds 생성
            setBeds(newBeds);
            initialLoadDoneRef.current = true;
        })
        .catch(console.error);
}, []);

useEffect(() => {
    setBeds(ROOM_NUMBERS.map(...)); // 빈 슬롯으로 초기화
    fetchAdmissions(true);
    fetchPendingRequests();
}, [fetchAdmissions, fetchPendingRequests]);
```

### 3.2 api.ts — GET 디바운스

```ts
// 중복 요청 디바운싱 (특히 GET 요청에 대해)
const requestKey = `${options?.method || 'GET'}:${url}`;
const now = Date.now();
if ((options?.method || 'GET') === 'GET' && pendingRequests.has(requestKey)) {
    if (now - (pendingRequests.get(requestKey) || 0) < 100) {
        // 100ms 이내 중복 요청은 무시. 빈 객체 반환.
        return {} as T;
    }
}
pendingRequests.set(requestKey, now);
// ... 실제 fetch ...
```

### 3.3 WebSocket onOpen

```ts
onOpen: () => {
    if (initialLoadDoneRef.current) fetchAdmissions();  // 초기 로드 완료된 뒤에만 호출
    fetchPendingRequests();
},
```

---

## 4. 의심 원인 (가설) — 반드시 검증 요청

1. **Next.js Strict Mode 이중 실행 + API 100ms 디바운스**
   - 개발 모드에서 `useEffect`가 두 번 실행됨.
   - 첫 번째 실행: `fetchAdmissions(true)` → `requestRef = 1`, `api.get('/api/v1/admissions')` → 실제 요청 1 발생, `pendingRequests.set(key, t1)`.
   - 두 번째 실행: 다시 `fetchAdmissions(true)` → 스로틀은 force로 통과 → `requestRef = 2`, `api.get(...)` 호출. **이때 api 레이어에서 100ms 이내 동일 URL이라 `{} as T` 즉시 반환.**
   - 두 번째 요청의 `.then(admissions => ...)`에서 `admissions`가 `{}` → `Array.isArray(admissions)` false → `setBeds` 호출 안 함.
   - 나중에 **첫 번째 요청**의 응답이 도착하면 `currentRequestId(1) !== requestRef.current(2)`라서 **시퀀스 가드에 걸려 역시 setBeds 생략.**
   - 결과: 어떤 응답도 그리드에 반영되지 않아 빈 그리드 유지.

2. **API 응답 형태 오해**
   - `api.get<T>()`가 axios처럼 `{ data: T }`를 반환하는데, 코드는 `admissions`를 배열로 가정하고 있다면 `Array.isArray(admissions)`가 false가 되어 setBeds가 호출되지 않을 수 있음. (현재 api.ts는 `JSON.parse(text)` 결과를 그대로 반환하므로, 백엔드가 배열을 주면 `admissions`는 배열임. 백엔드 응답 형식 확인 필요.)

3. **퇴원 후 reload**
   - `reload()` 후 스테이션 페이지가 다시 마운트되면 위와 동일한 "첫 로드" 경로가 재실행됨. Strict Mode면 동일한 race가 재현될 수 있음.

---

## 5. 점검 및 수정 요청 사항

1. **원인 특정**
   - `frontend/src/lib/api.ts`의 GET 100ms 디바운스가 **첫 번째 실제 요청보다 먼저** 두 번째 호출에 대해 `{}`를 반환하게 하고, 그 결과 `useStation.ts`에서 `!Array.isArray(admissions)`로 인해 setBeds가 호출되지 않는지 확인해 주세요.
   - Next.js Strict Mode로 인해 `useEffect`가 두 번 실행될 때, 두 번째 실행의 `fetchAdmissions(true)`가 100ms 이내에 같은 URL로 들어가 디바운스에 걸리는지 확인해 주세요.
   - 첫 번째 요청의 응답이 도착했을 때 `requestRef.current`가 이미 2라서 시퀀스 가드에 의해 버려지는지 확인해 주세요.

2. **수정 방향 (최소 변경 원칙)**
   - 스로틀(500ms)·시퀀스 가드·WebSocket onOpen 조건(`initialLoadDoneRef`)은 유지하는 것을 권장합니다.
   - 가능한 수정 후보:
     - **api.ts**: GET 디바운스 시 "같은 URL이 100ms 이내에 있으면 **두 번째 호출만** 막고, 첫 번째 호출은 그대로 가도록" 하거나, 특정 엔드포인트(예: `/api/v1/admissions`)는 디바운스 제외, 또는 디바운스 시 `{}` 대신 "첫 번째 진행 중인 Promise를 공유"하는 방식 등.
     - **useStation.ts**: 초기 로드 시 한 번만 실제 요청이 나가고, 그 응답이 반드시 반영되도록. 예: "초기 로드" 플래그로 useEffect의 두 번째 실행에서 fetchAdmissions(true)를 하지 않거나, "초기 로드 응답"은 시퀀스 가드 예외로 항상 setBeds 하도록.
   - 퇴원 후에는 가능하면 `reload()` 대신 `fetchAdmissions(true)` 등으로 그리드만 갱신하는 방안도 제안해 주세요 (증상 B 완화).

3. **출력 요청**
   - **근본 원인**을 한두 문장으로 명시.
   - **수정안**: 변경할 파일·함수/블록과 구체적인 코드 수정(패치 형태 또는 단계별 설명).
   - 수정이 **스로틀·시퀀스 가드·WebSocket 리싱크**에 미치는 영향을 한 줄씩이라도 적어 주세요.

---

## 6. 핵심 파일 경로

| 역할 | 경로 |
|------|------|
| 스테이션 페이지 | `frontend/src/app/station/page.tsx` |
| beds 상태, fetchAdmissions, useEffect, WebSocket handleMessage | `frontend/src/hooks/useStation.ts` |
| DEV 환자추가 / 스테이션 액션 | `frontend/src/hooks/useStationActions.ts` |
| 퇴원 핸들러 (reload 호출) | `frontend/src/hooks/usePatientActions.ts` |
| API 클라이언트 (GET 디바운스) | `frontend/src/lib/api.ts` |

---

위 현상·코드·가설을 바탕으로 **근본 원인**을 특정하고, **최소 변경**으로 그리드가 첫 로드와 퇴원 후 재로드 시에도 올바르게 채워지도록 수정안을 제시해 주세요.
