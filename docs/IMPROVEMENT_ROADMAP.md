# Eco Pediatrics — 코드 개선 로드맵

> **작성일:** 2026-03-10
> **원칙:** 각 페이즈 완료 후 사용자 피드백을 반영하여 다음 페이즈 진행.
> **진행 상태 표기:** `[ ]` 대기 | `[→]` 진행 중 | `[✓]` 완료 | `[✗]` 보류

---

## 전체 개요

| 페이즈 | 제목 | 영역 | 난이도 | 우선순위 |
|--------|------|------|--------|---------|
| Phase 1 | 타입 안전성 & API 레이어 강화 | Frontend + Backend | 낮음 | 즉시 |
| Phase 2 | 상태관리 & 실시간 통신 안정화 | Frontend | 중간 | 높음 |
| Phase 3 | Tauri IPC 아키텍처 전환 | Frontend + Tauri | 중간 | 높음 |
| Phase 4 | 백엔드 의존성 정리 & 구조 개선 | Backend | 낮음 | 중간 |
| Phase 5 | 테스트 & 개발자 경험(DX) 개선 | 전체 | 높음 | 장기 |

---

## Phase 1 — 타입 안전성 & API 레이어 강화
**목표:** 런타임 에러를 컴파일 타임에 잡고, API 호출의 신뢰성을 높임.

### 1-1. TypeScript `strict` 모드 활성화 및 타입 Gap 제거

**문제:**
- `frontend/tsconfig.json`에서 `strict: true` 여부 불명확
- `domain.ts`의 타입 정의가 일부 `any` 또는 느슨한 `string` 리터럴로 처리될 가능성
- 컴포넌트 props에 `any` 타입이 잔재할 경우 리팩토링 시 무결성 미보장

**개선 방향:**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,         // 활성화 확인
    "noUncheckedIndexedAccess": true,  // 배열 접근 안전성
    "exactOptionalPropertyTypes": true  // optional 필드 정밀 검사
  }
}
```

**작업 목록:**
- [✓] `tsconfig.json` strict 설정 확인 (이미 활성화 상태)
- [✓] `domain.ts` 전체 타입 리뷰 → `MealStatus`, `DocumentStatus`, `MealRequestType`, `MealTime` Union 타입 추출
- [✓] `any` 타입 사용처 전수 검색 후 제거 (6개 파일)
- [✓] 컴포넌트 Props 인터페이스 명시화 (`IVLabelPreviewModal`, `MealRequestModal`)

---

### 1-2. `api.ts` 요청 중복 제거(Deduplication) 전체 메서드로 확장

**문제:**
- 현재 `api.ts`의 deduplication이 GET 요청에만 적용됨
- 빠른 UI 조작 시 POST/PATCH 중복 요청 발생 가능 (식단 신청 버튼 중복 클릭 등)

**개선 방향:**
```typescript
// api.ts — mutation 중복 방지 패턴 추가
const pendingMutations = new Map<string, Promise<unknown>>();

async function dedupedPost<T>(url: string, body: unknown, key?: string): Promise<T> {
  const dedupeKey = key ?? `POST:${url}:${JSON.stringify(body)}`;
  if (pendingMutations.has(dedupeKey)) {
    return pendingMutations.get(dedupeKey) as Promise<T>;
  }
  const promise = fetchWithFallback<T>(url, { method: 'POST', body: JSON.stringify(body) });
  pendingMutations.set(dedupeKey, promise);
  promise.finally(() => pendingMutations.delete(dedupeKey));
  return promise;
}
```

**작업 목록:**
- [✓] POST/PATCH/PUT 중복 요청 방지 `pendingMutationPromises` Map 추가 (`api.ts`)
- [✓] body를 deduplication key에 포함하여 동일 요청만 수렴하도록 구현
- [✓] `post`, `put`, `patch` 메서드 body 타입 `any` → `unknown` 교체
- [ ] 버튼 로딩 상태(`isSubmitting`) 관리 표준화 (Phase 2 React Query 도입 시 병행)

---

### 1-3. 에러 핸들링 표준화 (Error Boundary + Toast)

**문제:**
- `error.tsx`, `global-error.tsx`가 존재하나 컴포넌트 단위 에러 경계 적용 여부 불명확
- API 에러 시 사용자 피드백(Toast/Alert)이 일관성 없이 구현될 가능성

**개선 방향:**
- 공통 `<ErrorBoundary>` 컴포넌트를 Station/Dashboard 페이지 루트에 감싸기
- `api.ts` 에러 응답 파싱을 구조화하여 에러 코드별 메시지 표준화

**작업 목록:**
- [✓] `src/components/ui/ErrorBoundary.tsx` 공통 컴포넌트 생성 (context prop 지원)
- [✓] Station, Dashboard 페이지 최상단에 ErrorBoundary 적용
- [✓] `useStationActions.ts` — 모든 `alert()` 호출을 `toaster.create()`로 교체
- [✓] `catch (e: any)` / `catch (err: any)` → `unknown` + `instanceof Error` 가드로 교체
- [ ] API 에러 응답 타입 `ApiError { code, message, detail }` 정의 (Phase 4 라우터 개선 시 병행)

---

### Phase 1 완료 기준
- [✓] TypeScript `any` 0개 (6개 파일 정리 완료)
- [✓] POST/PATCH 중복 요청 방지 구현 완료
- [✓] `alert()` → `toaster` 전환 완료
- [✓] Station/Dashboard 에러 경계 적용 완료

---
> **Phase 1 완료 후 피드백을 주세요. 피드백 반영 후 Phase 2를 진행합니다.**
---

## Phase 2 — 상태관리 & 실시간 통신 안정화
**목표:** 훅 중심 상태 관리의 한계를 보완하고 WebSocket 연결 안정성을 높임.

### 2-1. React Query 도입 (서버 상태 캐시 표준화)

**문제:**
- `useStation.ts`(17KB), `useVitals.ts`(20KB) 등 훅이 직접 fetch + 상태 관리를 동시에 처리
- 화면 전환 시 동일 API 중복 호출 발생
- 갱신 후 UI 동기화(`invalidate`)가 수동 처리로 산재

**개선 방향:**
```typescript
// 도입 후 예시
const { data: patients, invalidate } = useQuery({
  queryKey: ['station', 'patients'],
  queryFn: () => api.get('/api/v1/admissions?status=IN_PROGRESS'),
  staleTime: 30_000,
});

// mutation 후 자동 갱신
const addVital = useMutation({
  mutationFn: (data) => api.post('/api/v1/vitals', data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['station', 'patients'] }),
});
```

**작업 목록:**
- [✓] `@tanstack/react-query` 설치 및 `QueryClientProvider` 설정 (`src/components/Providers.tsx`)
- [✓] `useStation.ts` → React Query 기반으로 단계적 마이그레이션 (useQuery + setQueryData)
- [✓] `useVitals.ts` → React Query 기반 마이그레이션 (하이브리드: useQuery + setQueryData Optimistic)
- [✓] WebSocket 이벤트 수신 시 `invalidateQueries` / `setQueryData` 연동

---

### 2-2. WebSocket 재연결 & 안정성 강화

**문제:**
- `useWebSocket.ts`의 재연결 로직이 단순 interval 기반일 경우, 서버 재시작 시 무한 재연결 폭풍 가능성
- Idle timeout(120s) 이후 자동 재연결 UX 없음
- 연결 상태를 UI에 표시하는 인디케이터 부재

**개선 방향:**
```typescript
// Exponential Backoff 재연결 패턴
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // ms

function useWebSocketStable(url: string) {
  const attempt = useRef(0);
  const reconnect = useCallback(() => {
    const delay = BACKOFF_DELAYS[Math.min(attempt.current, BACKOFF_DELAYS.length - 1)];
    attempt.current++;
    setTimeout(() => connectWs(url), delay);
  }, [url]);
  // ...
}
```

**작업 목록:**
- [✓] `useWebSocket.ts`에 Exponential Backoff 재연결 로직 추가 (BACKOFF_DELAYS 배열 + attempt 카운터)
- [✓] 연결 상태(`CONNECTING|OPEN|CLOSED`) UI 인디케이터 추가 (`WsStatusIndicator.tsx`, Station 헤더 표시)
- [ ] 백엔드 `websocket_manager.py` idle timeout 후 클라이언트에 `close(1000, "idle")` 전송 표준화
- [✓] 페이지 visibility change(백그라운드/포그라운드 전환) 시 연결 복구 처리

---

### 2-3. 컴포넌트 상태 격리 (Prop Drilling 제거)

**문제:**
- `station/page.tsx`가 모든 상태를 보유하고 여러 Modal 컴포넌트에 깊은 props 전달 가능성
- 환자 선택 상태(`selectedPatient`)가 다수 컴포넌트에 걸쳐 반복 전달

**개선 방향:**
```typescript
// Context 기반 선택 상태 격리
const StationContext = createContext<StationContextValue>(null!);

export function StationProvider({ children }) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  return (
    <StationContext.Provider value={{ selectedPatient, setSelectedPatient }}>
      {children}
    </StationContext.Provider>
  );
}
```

**작업 목록:**
- [✓] `StationContext` 생성 및 선택 환자 상태 이관 (`src/contexts/StationContext.tsx`)
- [✓] Modal 컴포넌트들의 props 단순화 (selectedRoom, qrBed, admitRoom → Context)
- [ ] `DashboardContext` (보호자 대시보드용) 분리

---

### Phase 2 완료 기준
- [→] React Query DevTools에서 캐시 히트율 확인 (DevTools 개발 빌드에서 확인 가능)
- [✓] 서버 재시작 후 WebSocket 자동 재연결 정상 동작 확인 (Backoff + onOpen invalidate)
- [✓] 연결 상태 인디케이터가 Station 화면에 표시됨

---
> **Phase 2 완료 후 피드백을 주세요. 피드백 반영 후 Phase 3를 진행합니다.**
---

## Phase 3 — Tauri IPC 아키텍처 전환
**목표:** 무거운 Window Re-instantiation 패턴을 IPC 이벤트 기반으로 교체.

### 3-1. QR 코드 미리보기 창: Re-instance → IPC 이벤트 전환

**문제 (현재 패턴):**
```
QR 클릭 → 창 존재 확인 → close() → 200ms 대기 → 새 창 생성
```
- 200ms 강제 대기로 인한 UX 지연
- 창 닫기 중 다음 QR 클릭 시 경쟁 조건(Race Condition) 발생 가능
- 창 생성/파괴 반복으로 메모리 단편화

**개선 방향:**
```typescript
// 메인 창 → 미리보기 창으로 IPC 이벤트 발송
import { emit } from '@tauri-apps/api/event';

// QrCodeModal.tsx (main window)
async function openPreview(patient: Patient) {
  const existingWindow = await getByLabel('smartphone-preview');
  if (existingWindow) {
    // 창 재생성 없이 이벤트로 데이터 갱신
    await emit('update-preview-patient', { token: patient.accessToken });
    await existingWindow.setFocus();
  } else {
    // 최초 생성
    await createNewWindow(patient);
  }
}

// smartphone-preview window (수신 측)
import { listen } from '@tauri-apps/api/event';

useEffect(() => {
  const unlisten = listen('update-preview-patient', ({ payload }) => {
    setToken(payload.token); // React 상태 갱신 → 자동 리렌더
  });
  return () => { unlisten.then(fn => fn()); };
}, []);
```

**작업 목록:**
- [✓] `QrCodeModal.tsx`: IPC `emit('update-preview-patient')` 로직으로 전환
- [✓] 미리보기 창(`smartphone-preview`) 내부에 `listen` 훅 추가 (`useDashboardStats.ts`)
- [✓] `capabilities/default.json`에 `core:event:allow-emit`, `core:event:allow-listen` 권한 추가
- [✓] 기존 200ms 대기 및 close/create 로직 제거

---

### 3-2. Tauri 창 싱글톤 매니저 유틸 분리

**문제:**
- 창 관리 로직(`getByLabel`, `show`, `setFocus`, `close`)이 `QrCodeModal.tsx` 내부에 인라인 구현
- 향후 다른 Tauri 창 추가 시 동일 로직 중복 작성 필요

**개선 방향:**
```typescript
// src/utils/tauriWindowManager.ts
export const WindowManager = {
  async getOrCreate(label: string, url: string, options: WindowOptions) { ... },
  async sendEvent(label: string, event: string, payload: unknown) { ... },
  async focusWindow(label: string) { ... },
};
```

**작업 목록:**
- [✓] `src/utils/tauriWindowManager.ts` 유틸 모듈 생성
- [✓] `QrCodeModal.tsx`가 `WindowManager`를 사용하도록 리팩토링
- [ ] 창 관리 관련 `capabilities/default.json` 권한 주석 문서화

---

### Phase 3 완료 기준
- [✓] QR 코드 클릭 후 미리보기 갱신 시간 < 50ms (이전 200ms 대기 제거 확인)
- [✓] 빠른 연속 QR 클릭 시 Race Condition 없이 정상 갱신 확인
- [✓] `QrCodeModal.tsx`에 window close/create 로직 부재 확인

---
> **Phase 3 완료 후 피드백을 주세요. 피드백 반영 후 Phase 4를 진행합니다.**
---

## Phase 4 — 백엔드 의존성 정리 & 구조 개선
**목표:** 불필요한 의존성 제거로 배포 이미지 경량화 및 보안 공격 면적 축소.

### 4-1. `pyproject.toml` 의존성 감사 및 핵심 분리

**문제:**
- `pyproject.toml`에 163개 의존성 존재
- `selenium`, `playwright`, `flet`, `customtkinter` 등 웹 API 서버와 무관한 패키지 혼재
- 프로덕션 배포 시 공격 면적 및 이미지 크기 불필요하게 증가

**개선 방향:**
```toml
# pyproject.toml 의존성 그룹 분리
[project]
dependencies = [
  # Core API
  "fastapi", "uvicorn", "pydantic", "supabase", "loguru", "websockets",
]

[dependency-groups]
dev = ["pytest", "coverage", "httpx"]
tools = ["selenium", "playwright", "flet"]  # 스크립트 전용으로 격리
```

**작업 목록:**
- [ ] `pyproject.toml` 전체 의존성 리뷰 및 미사용 패키지 목록 작성
- [ ] `selenium`, `playwright`, `flet`, `customtkinter` → 별도 `tools/` 그룹으로 분리
- [ ] `scripts/` 전용 의존성과 `backend/` 실행 의존성 명확히 분리
- [ ] CI 환경에서 core only 설치 후 서버 기동 테스트

---

### 4-2. FastAPI 라우터 구조 개선 (응답 타입 명시화)

**문제:**
- 라우터 함수에 `response_model` 누락 시 자동 문서(OpenAPI) 정확성 저하
- Pydantic v2 `model_validator` 활용 여부 불명확

**개선 방향:**
```python
# routers/vitals.py 개선 예시
@router.post(
    "/",
    response_model=VitalSignResponse,  # 명시적 응답 타입
    status_code=201,
    summary="체온 및 투약 기록",
)
async def create_vital(
    payload: VitalSignCreate,
    supabase: AnnotatedSupabase = Depends(get_supabase),
) -> VitalSignResponse:
    ...
```

**작업 목록:**
- [ ] 모든 라우터 함수에 `response_model` 및 `status_code` 명시
- [ ] `models.py` Pydantic v2 `model_validator` 활용 가능 부분 개선
- [ ] OpenAPI 문서(`/docs`) 완성도 검증

---

### 4-3. 데이터베이스 뷰 안전성 강화

**문제 (기존 패턴):**
- `DROP VIEW ... CASCADE` 사용으로 마이그레이션 안전성 위험
- 시간 필터 제거 후 대용량 데이터 환경에서 쿼리 성능 미검증

**개선 방향:**
- `CREATE OR REPLACE VIEW` 제약 회피를 위해 컬럼 순서 보장 마이그레이션 패턴 표준화
- 최신 데이터 조회에 인덱스(`recorded_at DESC`) 확인

**작업 목록:**
- [ ] `view_station_dashboard` 관련 마이그레이션 파일 중복 정리
- [ ] `recorded_at`, `admission_id` 인덱스 존재 여부 확인 및 추가
- [ ] `fix_dashboard_view_v2.sql` 등 임시 픽스 파일 → 공식 마이그레이션으로 통합

---

### Phase 4 완료 기준
- [ ] 핵심 의존성만으로 백엔드 서버 정상 기동 확인
- [ ] 모든 API 엔드포인트 `/docs`에서 응답 스키마 정확히 표시
- [ ] `supabase/migrations/` 디렉토리 구조 정리 완료

---
> **Phase 4 완료 후 피드백을 주세요. 피드백 반영 후 Phase 5를 진행합니다.**
---

## Phase 5 — 테스트 & 개발자 경험(DX) 개선
**목표:** 회귀 방지망 구축 및 신규 개발자 온보딩 효율화.

### 5-1. 백엔드 통합 테스트 구축

**문제:**
- `pytest`가 설치되어 있으나 테스트 파일 존재 여부 불명확
- 핵심 비즈니스 로직(식단 신청, 수액 기록, 체온 기록)에 대한 자동화 테스트 부재

**개선 방향:**
```python
# tests/test_vitals.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_vital_sign(client: AsyncClient, admission_token: str):
    response = await client.post(
        f"/api/v1/vitals/",
        json={"temperature": 37.5, "has_medication": False},
        headers={"Authorization": f"Bearer {admission_token}"},
    )
    assert response.status_code == 201
    assert response.json()["temperature"] == 37.5
```

**작업 목록:**
- [ ] `backend/tests/` 디렉토리 및 `conftest.py` 구성
- [ ] Supabase 연동 없는 Mock 기반 단위 테스트 구현
- [ ] 핵심 라우터(vitals, meals, iv_records) 통합 테스트 작성
- [ ] GitHub Actions CI 파이프라인 설정 (`.github/workflows/test.yml`)

---

### 5-2. 프론트엔드 컴포넌트 테스트

**개선 방향:**
- **Vitest** + **Testing Library**로 주요 컴포넌트 단위 테스트
- `MealRequestModal`, `IVLabelPreviewModal` 등 복잡한 모달 우선 테스트

**작업 목록:**
- [ ] `vitest` + `@testing-library/react` 설치 및 설정
- [ ] `MealRequestModal.tsx` 렌더링 및 버튼 클릭 테스트
- [ ] `api.ts` 요청 deduplication 로직 단위 테스트

---

### 5-3. `eco.bat` 개발 메뉴 개선

**문제:**
- `eco check` 실행 시 `doctor.py`와 `security_check.py`가 별도 실행 → 결과 통합 불편

**개선 방향:**
```bat
REM eco.bat 메뉴 추가안
[6] Test    - Run all backend tests (pytest)
[7] Lint    - Run type check + lint
[8] Doctor  - Full system health check (doctor + security)
```

**작업 목록:**
- [ ] `eco.bat`에 `test`, `lint` 명령 추가
- [ ] `scripts/Run-Tests.ps1` 작성 (`pytest --cov=backend --cov-report=term`)
- [ ] `doctor.py` + `security_check.py` 결과를 통합 출력하는 `health_check.py` 작성

---

### Phase 5 완료 기준
- [ ] `eco test` 실행 후 핵심 라우터 테스트 통과율 80% 이상
- [ ] CI에서 PR마다 자동 테스트 실행
- [ ] `eco doctor` 한 번으로 전체 시스템 상태 파악 가능

---
> **Phase 5 완료 후 최종 리뷰를 진행합니다.**
---

## 부록 — 발견된 기술 부채 목록 (즉시 수정 불필요, 추적용)

| # | 위치 | 내용 | 위험도 |
|---|------|------|--------|
| TD-01 | `supabase/migrations/` | 임시 픽스 SQL 파일 혼재 (`fix_*`, `consolidated_*`) | 낮음 |
| TD-02 | `backend/routers/dev.py` | 개발 라우터 조건부 활성화 검증 필요 | 중간 |
| TD-03 | `frontend/src/hooks/` | `useStation.ts` (17KB), `useVitals.ts` (20KB) 단일 파일 과비대 | 낮음 |
| TD-04 | `pyproject.toml` | `pandas`, `numpy`, `openpyxl` 등 데이터 분석 패키지 혼재 | 낮음 |
| TD-05 | `frontend/next.config.js` | `output: 'export'` (SSG) + `unoptimized images` — CDN 미활용 | 낮음 |
| TD-06 | `backend/main.py` | WebSocket warm-up 로직 및 Lifespan 검증 필요 | 낮음 |
