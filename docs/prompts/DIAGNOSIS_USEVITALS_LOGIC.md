# useVitals.ts 논리 전용 진단 보고서

> 프로토콜(`PROMPT_REFACTOR_LOGIC_ONLY_PROTOCOL.md`) 및 체크리스트(`PROMPT_REFACTOR_AREAS_AND_CHECKLIST.md`)에 따른 진단 결과.

---

## 1. 진단 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| API 응답 형식 | OK | `api.get<DashboardResponse>()` 반환값을 `data`로 직접 사용. `res.data` 접근 없음. |
| requestRef 증가 시점 | OK | 스로틀(500ms) 통과 직후 `currentRequestId = ++requestRef.current` (65~68행). |
| 시퀀스 가드 | OK | 응답 처리 시 `currentRequestId !== requestRef.current && !opts?.force`로 오래된 응답 무시. force 시 가드 우회. |
| 빈 응답 방어 | OK | `!data || Object.keys(data).length === 0` 시 early return, 기존 상태 유지 (80~85행). |
| 100ms GET 디덱 | 완화됨 | force 시 `?_t=${Date.now()}`로 URL 차별화해 dedup 우회. 초기/onOpen은 동일 URL이지만 500ms 스로틀로 동시 호출 억제. |
| 초기 로드 1회 | OK | `initialFetchDoneRef`로 effect가 token/enabled당 1회만 `fetchDashboardData()` 호출. |

**결론**: 현재 코드에서 **치명적인 논리 결함은 없음**. 500ms 스로틀과 effect 1회 실행으로 초기 로드와 onOpen이 동시에 나가도 두 번째는 스로틀에서 return하여 단일 요청만 전송됨.

---

## 2. 호출 경로 정리

- **useEffect (312~321행)**: `token`/`enabled` 유효 시 `initialFetchDoneRef.current`가 false일 때만 1회 `fetchDashboardData()` 호출. 호출 직전에 `initialFetchDoneRef.current = true` 설정.
- **useWebSocket onOpen (307행)**: 연결 시마다 `fetchDashboardData()` 호출(인자 없음 → force 아님).
- **debouncedRefetch**: 300ms 디바운스 후 `fetchDashboardData()`.
- **refetchDashboard / 서류 완료 등**: `fetchDashboardData({ force: true })` 호출 가능.

effect와 onOpen이 거의 동시에 실행되면, 먼저 실행된 쪽만 스로틀을 통과하고 요청 1회만 나가며, 나중 쪽은 500ms 미만으로 return. 따라서 100ms dedup으로 `{}`를 받는 경로는 없음.

---

## 3. 선택적 강화 (useStation과의 일관성)

**목적**: “첫 연결 시 onOpen에서는 fetch하지 않음” 패턴을 적용해, 이론적 경쟁 구간을 제거하고 useStation과 동일한 패턴으로 통일.

- **추가 ref**: `initialLoadDoneRef = useRef(false)` (effect용 `initialFetchDoneRef`와 별도).
- **설정 시점**: `fetchDashboardData` 내부에서 상태 업데이트를 모두 수행한 **직후**에 `initialLoadDoneRef.current = true` 설정.
- **onOpen**: `onOpen: () => { if (initialLoadDoneRef.current) fetchDashboardData(); }` 로 변경. 첫 연결 시에는 호출하지 않고, 재연결 시에만 호출.

**효과**: 초기 로드는 effect 한 경로에서만 요청이 나가며, onOpen은 재연결 시에만 리싱크. 구조·스타일 변경 없이 ref 1개와 onOpen 래핑만 추가하는 **외과적 수준** 변경.

---

## 4. 수정안 (선택적 강화 적용 시)

아래는 **선택적 강화**만 반영한 최소 diff입니다. 프로토콜상 필수는 아니며, 일관성·방어적 코딩 목적으로 적용할 경우 참고.

```diff
--- a/frontend/src/hooks/useVitals.ts
+++ b/frontend/src/hooks/useVitals.ts
@@ -56,6 +56,7 @@ export function useVitals(token: string | null | undefined, enabled: boolean = tr
     const tokenInvalidatedRef = useRef(false);
     // 초기 fetch는 token/enabled당 1회만 실행 (부모 리렌더 시 fetchDashboardData 참조 변경으로 인한 연쇄 호출 방지)
     const initialFetchDoneRef = useRef(false);
+    const initialLoadDoneRef = useRef(false);

     const fetchDashboardData = useCallback(async (opts?: { force?: boolean }) => {
@@ -118,6 +119,7 @@ export function useVitals(token: string | null | undefined, enabled: boolean = tr
             if (data.iv_records != null) setIvRecords(data.iv_records);
             if (data.exam_schedules != null) setExamSchedules(data.exam_schedules);
+            initialLoadDoneRef.current = true;
         } catch (err: any) {
@@ -169,6 +171,7 @@ export function useVitals(token: string | null | undefined, enabled: boolean = tr
     useEffect(() => {
         tokenInvalidatedRef.current = false;
         initialFetchDoneRef.current = false;
+        initialLoadDoneRef.current = false;
     }, [token]);

@@ -304,7 +307,10 @@ export function useVitals(token: string | null | undefined, enabled: boolean = tr
     const { isConnected } = useWebSocket({
         url: token ? `${api.getBaseUrl().replace(/^http/, 'ws')}/ws/${token}` : '',
         enabled: !!token && enabled,
-        onOpen: fetchDashboardData,
+        onOpen: () => {
+            if (initialLoadDoneRef.current) fetchDashboardData();
+        },
         onMessage: handleMessage
     });
```

---

## 5. 정리

- **필수 수정**: 없음. 현재 로직만으로도 초기 로드·onOpen·force 경로가 정합적으로 동작함.
- **선택 수정**: 위와 같이 `initialLoadDoneRef` + onOpen 조건부 호출을 넣으면 useStation과 동일한 “첫 연결 시 onOpen 미호출” 패턴으로 통일되며, 향후 타이밍 변화에 대한 방어가 한 겹 강화됨.
