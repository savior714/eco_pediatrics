# 진단 보고서: useDashboardStats.ts (Logic-Only)

**대상**: `frontend/src/hooks/useDashboardStats.ts`  
**기준**: `PROMPT_REFACTOR_LOGIC_ONLY_PROTOCOL.md`, `PROMPT_LOGIC_ONLY_REFACTOR_BATCH.md` §2

---

## 1. 요약

**치명적 논리 결함 없음.** 수정 불필요.  
이 훅은 **자체 fetch를 하지 않고** `useVitals(token, true, onDischarge)` 결과만 가공·노출하므로, 시퀀스 가드·필터·초기 로드는 모두 useVitals 진단 범위에 속함.

---

## 2. 진단 포인트별 결론

### 2.1 필터링 로직 / requestRef(시퀀스 가드)

- **확인**: useDashboardStats에는 **시간·스테이션 필터가 없고**, **직접 API 호출이 없음.**  
  통계용 데이터는 전부 `vitalsData`(= useVitals 반환값)에서 파생됨.
- **결론**: requestRef·최신 요청만 반영하는 로직은 **useVitals 내부**에 있으며, `DIAGNOSIS_USEVITALS_LOGIC.md`에서 이미 검토됨.  
  본 훅에서는 해당 포인트 적용 대상 아님.

### 2.2 Zero-Value 처리 (NaN / undefined 방지)

- **확인**:
  - useVitals는 `ivRecords`, `meals`, `documentRequests`를 `useState([])`로 초기화하므로, **항상 배열**이 전달됨. `undefined` 접근 불가.
  - `latestIv`: `vitalsData.ivRecords.length > 0 ? vitalsData.ivRecords[0] : null` → 빈 배열이면 `null`.
  - `currentMeal` / `currentMealLabel`: 동일하게 빈 배열이면 `null`.
  - `allDocItems` / `requestedDocItems`: `.filter().flatMap()` 결과가 빈 배열이면 `[]`.
  - `currentDocLabels`: `Array.from(new Set([])).map(...)` → `[]`.  
  - `DOC_MAP[id] || id`: 라벨 없을 때 `id`로 폴백.
- **결론**: **빈 응답·빈 배열 시에도 NaN·undefined로 깨지지 않고**, null/[]/문자열 폴백으로 안전함. 별도 Fallback 추가 불필요.

### 2.3 순환 호출 방어 (무한 루프 가능성)

- **확인**:
  - 훅 내부에는 **데이터 fetch를 유발하는 useEffect가 없음.**  
    `useEffect`는 로컬스토리지에서 `viewMode` 복원 1회만 수행.
  - `refetch`는 `vitalsData.refetchDashboard`를 그대로 노출하며, **호출 주체는 상위 컴포넌트**임.
  - `vitalsData` 변경 → 리렌더 → 파생값 재계산만 발생하며, 이 훅이 다시 fetch를 트리거하는 경로는 없음.
- **결론**: **순환 호출·무한 루프 가능성 없음.** useMemo/useCallback 의존성 배열에서도 이슈 없음.

---

## 3. Master Auditor 체크 (참고)

| 필터 | 결과 |
|------|------|
| Surgical Check | 수정 제안 없음. |
| Logic Consistency | useVitals의 requestRef·initialLoadDoneRef 패턴과 충돌 없음. |
| Style Preservation | 변경 없음. |

---

## 4. 정리

- **수정안**: 없음.  
- **유지보수 시**: 대시보드 상단 통계의 **필터·시퀀스·초기 로드** 관련 이슈는 useVitals 및 dashboard 페이지 진입점(§4) 쪽을 우선 점검하면 됨.
