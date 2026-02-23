# [디버깅 프롬프트] 스테이션 그리드가 비어 있는 현상 (최초 로드 + 퇴원 후)

> 아래 블록 전체를 다른 LLM(Claude, GPT 등)에 복사해 붙여 넣어, 원인 분석 및 수정안을 요청하세요.

---

## 1. 현상 요약

- **앱**: Eco-Pediatrics Station Control (Next.js 프론트 + FastAPI 백엔드, dev 모드)
- **화면**: "환자 리스트" 탭 — 방별 카드 그리드(301, 302, … 402-4 등 30개). 각 카드에는 환자 정보 또는 "입원" 버튼이 표시됨.

### 증상 A — 최초 로드 시 빈 그리드 (미해결)

- 앱을 **처음 실행**했을 때, 백엔드에는 이미 입원 환자가 등록되어 있음에도 **모든 카드가 빈 슬롯처럼 보임** (방 번호 + "입원" 버튼만 보이고 환자명/체온 등 없음).
- **"DEV: 환자추가"** 버튼을 한 번 누르면, 그제서야 **한 번에** 실제 환자 데이터가 반영된 카드로 렌더링됨.
- **이미 시도한 수정**: `fetchAdmissions(force?: boolean)` 도입, `useEffect`에서 `fetchAdmissions(true)` 호출로 초기 1회는 스로틀 무시. **그러나 현상은 그대로임.**

### 증상 B — 퇴원 후 그리드가 다시 비어 있음 (신규)

- **한 명** 환자를 퇴원시키면(환자 카드 → 상세 → 퇴원 버튼 → 확인), 퇴원 API 성공 후 **그리드가 다시 텅 빈 상태**가 됨 (방 번호 + 입원 버튼만 보임).
- 퇴원 처리 직후에는 `window.location.reload()`가 호출되어 스테이션 페이지가 **전체 새로고침**되며, 그 시점부터 빈 그리드가 보이는 것으로 추정됨.

### 기대 동작

- 최초 로드 및 reload 시점에 `GET /api/v1/admissions` 응답이 오면, 그 결과로 카드가 채워져야 함.
- 퇴원 후 reload가 되더라도, 재로드된 페이지에서 동일 API로 남은 입원 목록이 그리드에 표시되어야 함.

---

## 2. 기술 스택 및 데이터 흐름

- **스테이션 페이지**: `frontend/src/app/station/page.tsx` — `useStationActions()` 훅 사용, `beds`를 그리드에 매핑해 렌더링.
- **데이터 소스**: `frontend/src/hooks/useStation.ts`
  - `beds` 상태는 `fetchAdmissions()` 내부에서 `api.get<AdmissionSummary[]>('/api/v1/admissions')` 응답으로 `setBeds(newBeds)` 호출로 갱신됨.
  - **현재 구현**: `fetchAdmissions(force = false)`. 스로틀(500ms) 통과 시에만 `requestRef.current` 증가 후 API 호출. 응답 시 `currentRequestId !== requestRef.current`이면 `setBeds` 생략(시퀀스 가드).
  - **최초 로드**: `useEffect`에서 (1) 빈 슬롯으로 `setBeds(ROOM_NUMBERS.map(...))` 초기화, (2) `fetchAdmissions(true)`, (3) `fetchPendingRequests()` 호출.
  - **WebSocket**: `useWebSocket`의 `onOpen`에서 `fetchAdmissions()`(force 없음), `fetchPendingRequests()` 호출. `ADMISSION_DISCHARGED` / `ADMISSION_TRANSFERRED` 수신 시에도 `fetchAdmissions()` 호출.
- **퇴원 플로우**: `frontend/src/hooks/usePatientActions.ts`의 `handleDischarge`에서 `api.post(/api/v1/admissions/${bed.id}/discharge)` 호출 후 `alert('퇴원 완료')`, `onClose()`, **`window.location.reload()`** 호출. reload로 스테이션 페이지가 다시 마운트되며 위 "최초 로드" 경로가 그대로 재실행됨.

---

## 3. 의심 원인 (가설)

1. **API 응답 형식 불일치**
   - `api.get<T>()`의 반환값이 axios처럼 `{ data: T }`인데, 코드에서는 응답 전체를 배열로 가정하고 `Array.isArray(admissions)` 등으로 쓰고 있을 수 있음. 그러면 `setBeds` 분기로 못 들어가 빈 상태 유지.

2. **시퀀스 가드와 스로틀의 결합 (재검토)**
   - `fetchAdmissions(true)`로 1회 요청이 나가도, WebSocket `onOpen`이 거의 동시에 `fetchAdmissions()`를 호출해 `requestRef`가 올라가고, **첫 번째 응답이 도착했을 때** 가드에 걸려 버려질 수 있음. (이미 ID 할당을 스로틀 통과 후로 옮겼지만, `force` 호출과 `onOpen` 호출이 동시에 들어가면 두 요청이 모두 나갈 수 있음.)

3. **reload 직후 타이밍**
   - 퇴원 후 `reload()`로 재진입 시, 백엔드가 아직 퇴원 반영 중이거나, WebSocket이 빠르게 재연결되며 `onOpen` → `fetchAdmissions()`가 effect의 `fetchAdmissions(true)`보다 먼저/겹쳐 실행되어 동일한 race가 재현될 수 있음.

4. **Strict Mode 이중 실행**
   - Next.js dev에서 `useEffect`가 두 번 실행될 때, 첫 요청 응답이 두 번째 effect 실행으로 인한 상태 초기화나 두 번째 요청 ID에 의해 가드에서 걸러지는지 확인 필요.

---

## 4. 점검 요청 사항

1. **`frontend/src/hooks/useStation.ts`**
   - `api.get<AdmissionSummary[]>('/api/v1/admissions')`의 **실제 반환 형태** 확인 (Promise\<T\>인지 Promise\<{ data: T }\>인지). `.then(admissions => ...)`에서 `admissions`가 진짜 배열인지, 아니면 `admissions?.data`를 써야 하는지 검증.
   - `useEffect`와 WebSocket `onOpen`이 거의 동시에 `fetchAdmissions`를 호출할 때, **두 요청이 모두 전송되는지**, 그리고 먼저 도착한 응답이 시퀀스 가드에 걸려 버려지는지 로그 또는 브레이크포인트로 확인.
   - 초기 로드(reload 포함) 시 **한 번만** 요청을 보내고 응답을 반드시 반영하도록, 예를 들어 "초기 로드 중" ref로 onOpen에서의 `fetchAdmissions()` 호출을 지연하거나 생략하는 방안 검토.

2. **퇴원 후 플로우**
   - `usePatientActions`의 `handleDischarge`에서 `reload()` 대신, 퇴원 성공 후 WebSocket `ADMISSION_DISCHARGED` 수신에 의존하거나 `fetchAdmissions(true)`를 한 번 호출해 그리드만 갱신하는 방식으로 바꾸면 증상 B가 사라지는지 실험해 보세요. (그래도 증상 A가 남으면 원인은 초기 로드 경로에 있음.)

3. **수정 방향 제안**
   - **최소 변경**으로: (1) 초기 로드 및 reload 직후 **한 번은** 반드시 `setBeds(실제 데이터)`가 호출되게 하고, (2) 퇴원 후에는 그리드가 비어 보이지 않게(같은 race 제거 또는 reload 제거/대체) 수정안을 제시해 주세요.

---

## 5. 핵심 파일 경로

| 역할 | 경로 |
|------|------|
| 스테이션 페이지 | `frontend/src/app/station/page.tsx` |
| beds 상태·fetchAdmissions·초기 effect·WS handleMessage | `frontend/src/hooks/useStation.ts` |
| DEV 환자추가 핸들러 | `frontend/src/hooks/useStationActions.ts` |
| 퇴원 핸들러 (reload 호출) | `frontend/src/hooks/usePatientActions.ts` |
| API 클라이언트 | `frontend/src/lib/api.ts` |

---

위 **증상 A·B**와 기술 맥락을 바탕으로 **근본 원인**을 특정하고, **스로틀·시퀀스 가드·WebSocket 리싱크**에 불필요한 부수 영향을 주지 않는 수정안을 제안해 주세요.
