# 디버깅 프롬프트: 신청된 서류 섹션에 완료된 서류가 표시되지 않는 문제

---

## 질문/요청 (LLM용)

**"환자 상세 모달(간호 스테이션)에서 '요청 사항' 섹션의 서류 신청 항목에 '완료' 버튼을 눌렀을 때, '신청된 서류' 섹션에 해당 항목이 나타나지 않습니다. 보호자 대시보드에서는 동일 입원의 완료된 서류가 정상적으로 표시됩니다. 원인을 추적하고 수정안을 제안해 주세요."**

---

## 문제 요약

- **증상**: 환자 상세 모달에서 **"서류 신청 완료"** 버튼 클릭 시:
  1. "요청 사항"에서 해당 항목은 사라짐 (removeNotification 동작)
  2. **"신청된 서류"** 섹션에는 나타나지 않음. 항상 "신청된 서류 없음" 상태
- **비교**: 보호자 대시보드에서는 동일 입원의 완료된 서류가 "신청된 서류"로 정상 표시됨
- **이전 수정**: 완료 버튼 클릭 시 모달 전체가 초기 상태로 리셋되던 문제는 SSOT 적용으로 해결됨
- **현재**: cache-busting(`?_t=${Date.now()}`) 적용 후에도 동일 증상 지속

---

## 환경

- **프론트엔드**: Next.js, React, TypeScript
- **백엔드**: FastAPI, Supabase
- **API 엔드포인트**:
  - `GET /api/v1/dashboard/{token}` (X-Admission-Token 헤더)
  - `PATCH /api/v1/documents/requests/{request_id}?status=COMPLETED`
  - `GET /api/v1/station/pending-requests`

---

## 데이터 흐름 (단계별)

### 1. 완료 버튼 클릭

```
PatientDetailSidebar.tsx (요청 사항 섹션)
  → onClick: onCompleteRequest(notif.id, notif.type)
  → notif.id: "doc_34" 형식 (type_rawId)
```

### 2. PatientDetailModal onCompleteRequest 핸들러

```tsx
// PatientDetailModal.tsx 라인 163-169
onCompleteRequest={async (id, type) => {
    await onCompleteRequest?.(id, type, bed.id);   // Station의 removeNotification
    await fetchDashboardData({ force: true });      // useVitals 리프레시
    requestAnimationFrame(() => {
        document.getElementById('patient-sidebar-completed-docs')?.scrollIntoView({ behavior: 'smooth' });
    });
}}
```

### 3. removeNotification (useStation.ts)

- `id` 파싱: `doc_34` → `rawId=34`
- API: `PATCH /api/v1/documents/requests/34?status=COMPLETED`
- 성공 시: `setNotifications(prev => prev.filter(n => n.id !== id))` → 요청 사항에서 항목 제거

### 4. fetchDashboardData (useVitals.ts)

- URL: `GET /api/v1/dashboard/${token}?_t=${Date.now()}` (force 시 cache-busting)
- 헤더: `X-Admission-Token: ${token}`
- 응답 처리: `if (data.document_requests != null) setDocumentRequests(data.document_requests)`
- **주의**: `data`가 `{}`이면 `document_requests`는 undefined → `setDocumentRequests` 호출 안 함

### 5. PatientDetailSidebar "신청된 서류" 섹션

- Props: `documentRequests={fetchedDocRequests}` (useVitals.documentRequests)
- 필터: `documentRequests.filter(r => String(r.status ?? '').toUpperCase() === 'COMPLETED')`
- 빈 경우: "신청된 서류 없음" 표시

---

## 핵심 파일 및 코드 위치

| 파일 | 역할 | 핵심 라인 |
|------|------|----------|
| `frontend/src/components/patient-detail/PatientDetailSidebar.tsx` | 신청된 서류 UI, completedDocs 필터 | 43-46, 94-118 |
| `frontend/src/hooks/useVitals.ts` | documentRequests 상태, fetchDashboardData | 39, 57-109 |
| `frontend/src/components/PatientDetailModal.tsx` | onCompleteRequest → removeNotification + fetchDashboardData | 163-169, 152 |
| `frontend/src/hooks/useStation.ts` | removeNotification, PATCH 호출 | 284-299 |
| `frontend/src/lib/api.ts` | GET 요청 100ms dedup (동일 URL) | 56-65 |
| `backend/services/dashboard.py` | document_requests 조회 (status 필터 없음) | 49-56, 90 |
| `backend/routers/station.py` | PATCH /documents/requests/{id}, dashboard 라우트 | 110-150, 17-42 |

---

## 백엔드 정책 (CRITICAL_LOGIC.md §3.3)

- **document_requests**: PENDING·COMPLETED 구분 없이 해당 입원의 최근 요청 반환
- **dashboard.py**: `.eq("admission_id", admission_id)` 만 사용, status 필터 없음

---

## 근본 원인 분석 (Root Cause) 및 적용 수정

### 진단 요약
- **결론**: 데이터 부재가 아니라 **프론트엔드 상태 업데이트 누락** 또는 **API 응답 가로채기(dedup)**.
- **가장 유력**: useVitals 시퀀스 가드와 api.ts 100ms 중복 방지 로직 간 충돌.

### 가설 A: 시퀀스 가드에 의한 업데이트 유실 (가장 유력)
1. 완료 클릭 → `fetchDashboardData({ force: true })` (fetch1) 실행.
2. 거의 동시에 웹소켓 `DOC_REQUEST_UPDATED` → `debouncedRefetch` (fetch2) 실행.
3. fetch2가 먼저 `requestRef`를 N+1으로 올리면, fetch1 응답 도착 시 `currentRequestId (N) !== requestRef.current (N+1)`로 **상태 업데이트가 통째로 무시**됨.
4. fetch2가 api.ts 100ms dedup으로 `{}`를 받으면, document_requests는 갱신되지 않음.

### 가설 B: api.ts 빈 객체 반환
- 100ms 이내 동일 URL GET 시 `{}` 반환. `data.document_requests != null` 체크에서 통과하지 못해 기존 상태 유지.

### 가설 C: RLS 정책
- `backend/fix_document_requests_rls.sql`: SELECT 정책은 **admission_id로 admissions와 조인 + admissions.status IN ('IN_PROGRESS','OBSERVATION')** 만 사용. **document_requests.status 조건 없음** → COMPLETED 행도 조회 가능. (실제 문제 시 Supabase 대시에서 정책 재확인 권장.)

### 적용 수정 (useVitals.ts)
1. **Force 응답 우선**: `currentRequestId !== requestRef.current`일 때도 **`opts?.force`이면 무시하지 않고 응답 적용** (수동 리프레시가 항상 UI에 반영되도록).
2. **빈 응답 처리**: `data`가 `{}`이거나 키가 없으면 상태 덮어쓰지 않고 `console.error('[useVitals] Received empty data from API')` 로그.
3. **document_requests 명시 처리**: `data.document_requests !== undefined`일 때만 `setDocumentRequests(data.document_requests || [])` 호출.
4. **디버깅**: 시퀀스 가드로 무시될 때 `console.warn('[useVitals] Outdated request ignored: ...')` 출력.

---

## 디버깅 체크리스트 (검증 순서)

1. **브라우저 Network 탭**
   - 완료 버튼 클릭 직후 `PATCH /api/v1/documents/requests/{id}?status=COMPLETED` → 200 응답 확인
   - 직후 `GET /api/v1/dashboard/{token}?_t=...` 호출 여부 확인
   - GET 응답 본문에 `document_requests` 배열이 있는지, 그 안에 `status: "COMPLETED"`인 항목이 있는지 확인

2. **백엔드/DB**
   - PATCH 후 `document_requests` 테이블에서 해당 `id`의 `status`가 `COMPLETED`로 업데이트되었는지 확인
   - Supabase RLS: `document_requests`의 COMPLETED 레코드 SELECT 정책이 허용되는지 확인

3. **프론트엔드**
   - (수정 적용됨) `force: true` 응답은 시퀀스 가드와 관계없이 상태에 반영. 빈 `{}` 수신 시 덮어쓰지 않고 로그만 출력.
   - api.ts: GET 요청 시 100ms 이내 동일 URL 요청이 있으면 `{}` 반환 (cache-busting `?_t=` 로 우회).
   - `PatientDetailSidebar`의 `documentRequests` prop이 useVitals의 `documentRequests`와 올바르게 연결되어 있는지 확인

4. **타이밍**
   - `removeNotification`(async) 완료 후 `fetchDashboardData` 호출. PATCH 완료 시점에 DB 반영이 끝나 있어야 함
   - `force: true`로 500ms 쓰로틀 우회, cache-busting으로 100ms dedup 우회

---

## 추가 컨텍스트

- **DocumentRequest 타입** (domain.ts): `id`, `admission_id`, `request_items`, `status`, `created_at`
- **status 값**: `PENDING`, `COMPLETED` (대소문자 불일치 방지를 위해 `String(r.status ?? '').toUpperCase() === 'COMPLETED'` 사용)
- **Guardian vs Station**: 둘 다 `GET /api/v1/dashboard/{token}` 사용. Guardian은 보호자 페이지에서, Station은 환자 상세 모달(useVitals)에서 호출. 토큰은 입원의 `access_token`

---

## 요청 사항 (LLM 액션)

1. 위 흐름과 체크리스트를 기준으로 **왜 "신청된 서류" 섹션에 완료된 서류가 표시되지 않는지** 원인을 추적하세요.
2. Network 탭에서 `/dashboard` 응답의 `document_requests` 내용, 백엔드 PATCH 성공 여부, RLS 정책을 확인하는 것이 유효한 디버깅 경로입니다.
3. 원인 파악 후 **수정안(코드 diff 또는 변경 제안)**을 제시하세요.
4. 필요 시 `fix_document_requests_rls.sql`, `backend/dependencies.py`(get_supabase), Supabase RLS 정책 문서를 참고하세요.

---

## 다음 할 일 (검증)

- **Network 탭 검증**: 브라우저 Network 탭에서 `GET /api/v1/dashboard/{token}` 응답 본문에 `document_requests` 배열 및 `status: "COMPLETED"` 항목 존재 여부 확인.
  - **응답에 COMPLETED 있음** → 프론트 수정(force 우선, 빈 응답 처리)으로 해결된 것. 콘솔 `[useVitals] Outdated request ignored` / `Received empty data` 로그 확인.
  - **응답에 COMPLETED 없음** → 백엔드/RLS 추가 조사 필요.
