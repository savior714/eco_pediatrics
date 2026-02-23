# 진단 보고서: PatientDetailModal.tsx (Logic-Only)

**대상**: `frontend/src/components/PatientDetailModal.tsx`  
**기준**: `PROMPT_REFACTOR_LOGIC_ONLY_PROTOCOL.md`, `PROMPT_LOGIC_ONLY_REFACTOR_BATCH.md` §3, `REFACTOR_AUDITOR_GUIDE.md` §1.2

---

## 1. 진단 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| **ID 불일치 방어** | OK | 데이터 소스가 useVitals 단일 훅이며, useVitals 내부 requestRef로 경쟁 상태 방어됨. |
| **데이터 잔상 (Ghosting)** | **수정 반영** | useVitals에서 **token 변경 시 대시보드 상태 즉시 초기화**로 해소. (모달에 로컬 patientData 없음) |
| **Cleanup 논리** | **수정 반영** | useVitals에 **isMountedRef** 도입, 응답 도착 시 언마운트 여부 확인 후 setState 수행. |
| **수정 후 동기화** | OK | 저장 성공 후 `onSuccess` / `refetch` 트리거가 부모·useStation으로 정상 전달됨. |

---

## 2. 아키텍처 참고 (현재 코드베이스)

- PatientDetailModal은 **로컬 `patientData` 상태와 전용 `fetchPatientDetail(admissionId)`를 두지 않음.**  
  상세 데이터는 **`useVitals(bed?.token, isOpen, onClose)`** 한 훅에서만 조회·보관함.
- 따라서 **잔상 방지·경쟁 상태·cleanup** 처리는 **useVitals.ts**에서 수행하는 것이 일관됨.

---

## 3. 적용한 외과적 수정 (useVitals.ts)

1. **token 변경 시 상태 즉시 초기화**  
   `useEffect(..., [token])` 안에서 ref 초기화에 더해  
   `setVitals([])`, `setMeals([])`, `setDocumentRequests([])`, `setIvRecords([])`, `setExamSchedules([])` 및 admission 관련 상태를 null/초기값으로 리셋.  
   → 환자(토큰) 전환 시 이전 환자 데이터가 잠깐 보이는 잔상 제거.

2. **언마운트 후 setState 방지**  
   `isMountedRef` 도입 및 마운트 시 true, cleanup에서 false 설정.  
   `fetchDashboardData` 내부에서 응답 처리 직전에 `if (!isMountedRef.current) return;` 추가,  
   `finally`에서 `setIsRefreshing(false)` 호출 시에도 `isMountedRef.current` 확인.

- **PatientDetailModal.tsx**: 논리 변경 없음. (데이터 소스·생명주기는 useVitals에 위임된 구조 유지.)

---

## 4. Master Auditor 체크

| 필터 | 결과 |
|------|------|
| **Surgical Check** | useVitals의 token-effect 확장 + isMountedRef 및 가드 추가만으로 결함 해결. |
| **Logic Consistency** | 기존 requestRef 시퀀스 가드와 병행하여 동작하며, 500ms 스로틀 등 기존 패턴 유지. |
| **Style Preservation** | PatientDetailModal JSX·UI 로직 무변경. useVitals만 최소 수정. |

---

## 5. 정리

- **필수 수정**: useVitals에 반영 완료. (token 변경 시 상태 초기화 + 언마운트 가드)
- **기대 효과**: 환자 전환 시 데이터 섞임·이전 환자 잔상 제거, 모달/페이지 이탈 후 비동기 응답에 의한 setState 경고 방지.
