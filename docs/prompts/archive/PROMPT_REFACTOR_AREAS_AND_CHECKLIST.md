# [리팩토링 프롬프트] 적용 대상 및 논리 결함 체크리스트

> 논리적 결함만 제거하는 리팩토링 시 **어디를 볼지**, **무엇을 점검할지** 정리한 문서입니다. `PROMPT_REFACTOR_LOGIC_ONLY_PROTOCOL.md`와 함께 다른 LLM에 전달하세요.

---

## 1. 이미 수정된 사례 (참고용)

아래는 이번 세션에서 적용한 **논리 결함 제거** 패턴입니다. 동일한 패턴이 다른 모듈에 있으면 같은 lens로 검토하면 됩니다.

### 1.1 스테이션 그리드 초기 로드 (`useStation.ts`)

- **문제**: effect의 `fetchAdmissions(true)`와 WebSocket `onOpen`의 `fetchAdmissions()`가 거의 동시에 호출됨. `api`의 100ms GET 중복 방지로 둘 중 한 쪽이 `{}`를 받고, 실제 응답은 다른 쪽 요청 것이라 시퀀스 가드에 걸려 버려짐.
- **수정**: (1) `fetchAdmissions(force?)` 도입, 스로틀 통과 후에만 `requestRef` 증가. (2) `initialLoadDoneRef` 도입, `setBeds` 성공 후에만 true. (3) onOpen에서는 `initialLoadDoneRef.current`가 true일 때만 `fetchAdmissions()` 호출(첫 연결 시 스킵, 재연결 시만 리싱크).
- **관련 파일**: `frontend/src/hooks/useStation.ts`, `frontend/src/lib/api.ts`(100ms dedup).

### 1.2 API 응답 형식

- **사실**: `frontend/src/lib/api.ts`의 `get<T>()`는 **JSON body를 그대로 `T`로 반환**함 (axios처럼 `{ data: T }`가 아님).
- **주의**: `const { data: x } = await api.get(...)`로 쓰면 `x`가 undefined가 되어, `Array.isArray(x)` 등에서 early return하고 상태가 갱신되지 않음. `.then(body => ...)`에서 `body`가 곧 배열/객체임을 전제로 사용해야 함.

### 1.3 에러 모니터 로그 소스

- **문제**: 프론트엔드 터미널 출력이 파일로 기록되지 않아 Error Monitor가 감지할 수 없음.
- **수정**: `scripts/launch_wt_dev.ps1`에서 프론트엔드 실행 시 `2>&1 | Tee-Object -FilePath logs\frontend.log` 추가. (인코딩은 `error_monitor.py`의 `_tail`에서 이미 UTF-16LE 대응.)

---

## 2. 시퀀스 가드·스로틀을 쓰는 모듈 (검토 후보)

아래 모듈들은 **requestRef / lastFetchRef / initialFetchDoneRef** 등으로 “오래된 응답 무시” 또는 “중복 fetch 방지”를 하고 있습니다. effect·onOpen·사용자 액션 등 **여러 트리거**가 같은 fetch를 부를 수 있으면, 1.1과 유사한 race가 있는지 검토하는 것이 좋습니다.

| 파일 | 패턴 | 검토 포인트 |
|------|------|-------------|
| `frontend/src/hooks/useStation.ts` | requestRef, lastFetchRef, initialLoadDoneRef, fetchAdmissions(force) | 위 1.1 반영 완료. 추가 수정 시 동일 원칙 유지. |
| `frontend/src/hooks/useVitals.ts` | requestRef, lastFetchRef, initialFetchDoneRef, fetchDashboardData(opts?.force) | 초기 fetch·웹소켓·수동 refetch 간 호출 순서와 force 사용처 일치 여부. |
| `frontend/src/hooks/useMeals.ts` | requestRef, fetchPlans | 동일 URL에 대한 동시 호출(예: effect + 다른 트리거) 시 api 100ms dedup과의 상호작용. |
| `frontend/src/components/MealGrid.tsx` | requestRef, fetchMatrix | 위와 동일. |
| `frontend/src/hooks/useDashboardStats.ts` | (훅 내부 확인 필요) | 대시보드 상단 통계용 fetch가 여러 경로에서 호출되는지, 시퀀스 가드 필요 여부. |

---

## 3. API 레이어 (`frontend/src/lib/api.ts`)

- **100ms GET 중복 방지**: 동일 URL GET이 100ms 이내에 두 번 호출되면 **두 번째 호출은 네트워크를 타지 않고 `{} as T`를 즉시 반환**함.
- **영향**: 호출하는 쪽에서 `Array.isArray(res)`가 false가 되고, 상태 갱신이 스킵될 수 있음. 동시에 첫 번째 요청의 응답이 나중에 도착하면, 그때는 이미 `requestRef`가 다른 요청으로 올라가 있어 시퀀스 가드에 걸릴 수 있음.
- **검토**: “동일 URL을 effect와 onOpen(또는 다른 트리거)이 거의 동시에 호출하는가?”이면, 1.1처럼 **한쪽 트리거를 초기 로드 시에는 스킵**하거나, 호출 순서를 분리하는 방안을 우선 검토.

---

## 4. 논리적 결함 점검 체크리스트

다른 LLM이 특정 모듈을 검토할 때 아래를 순서대로 확인하면 됩니다.

1. **API 반환값 사용**
   - [ ] `api.get<T>()` / `api.post<T>()`의 반환값이 **body 직접**인지 `{ data }`인지 확인했는가?
   - [ ] `.then(x => ...)` 또는 `await api.get()` 후 사용하는 변수가 실제로 배열/객체를 가리키는가? (`Array.isArray` false로 인한 미갱신 여부)

2. **비동기 시퀀스 가드**
   - [ ] `requestRef`(또는 유사 ID) 증가 시점이 **실제로 요청이 나가기 직전**(스로틀·조건 통과 후)인가?
   - [ ] 응답 처리 시 “오래된 응답 무시” 조건이, **실제로 나간 요청**만 거르고 있는가? (초기 로드 응답이 잘못 거절되지 않는가?)

3. **초기 로드 vs 재연결**
   - [ ] 마운트 시 1회 실행되는 effect와 WebSocket `onOpen`(또는 기타 트리거)이 **같은 API를 동시에** 호출하는가?
   - [ ] 그렇다면 초기 로드만 한 경로에서만 호출하도록 ref·플래그로 분리했는가? (이미 적용: useStation의 `initialLoadDoneRef`.)

4. **API 100ms 디덱과의 관계**
   - [ ] 동일 URL GET을 100ms 이내에 두 번 부르는 경로가 있는가?
   - [ ] 있다면, 두 번째 호출이 `{}`를 받았을 때 상태가 “갱신 안 됨”으로 남고, 첫 번째 응답은 시퀀스 가드에 걸리지 않는가? 필요하면 트리거 분리(초기 로드 시 한쪽만 호출)로 해소.

5. **CRITICAL_LOGIC 준수**
   - [ ] 스로틀(500ms 등), WebSocket 트리거 + refetch, 토큰 만료 처리, 에러 마스킹 등 `docs/CRITICAL_LOGIC.md`에 적힌 동작을 깨뜨리지 않았는가?

---

## 5. 다른 LLM에게 구체 영역만 넘길 때 (복사용)

```
[PROMPT_REFACTOR_LOGIC_ONLY_PROTOCOL.md]와 [PROMPT_REFACTOR_AREAS_AND_CHECKLIST.md]의 원칙·체크리스트를 따라,
아래 모듈에 대해 **논리적 결함만** 점검해 주세요. 구조 변경·대규모 리팩터는 하지 마세요.

- 대상: [예: frontend/src/hooks/useVitals.ts 의 fetchDashboardData와 웹소켓/초기 로드 호출 경로]
- 의심 현상(있으면): [예: 수동 완료 후 리프레시가 가끔 반영되지 않음]
```

---

이 문서는 리팩토링 **대상**과 **점검 항목**만 정리한 것이며, 실제 수정은 프로토콜 문서와 CRITICAL_LOGIC을 준수한 채 최소 변경으로 진행하면 됩니다.
