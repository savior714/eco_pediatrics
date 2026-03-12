# 🗺️ Project Blueprint: Phase 5 — 테스트 & 개발자 경험(DX) 개선
> 생성 일시: 2026-03-12 | 상태: 설계 승인 대기

## 🎯 Architectural Goal
- 핵심 비즈니스 로직(식단 신청, 수액 기록, 체온 기록)에 대한 백엔드 자동화 테스트 구축
- `backend/tests/`의 산발적 테스트 파일을 `conftest.py` 중심으로 재구성
- 프론트엔드 주요 컴포넌트(MealRequestModal, IVLabelPreviewModal) Vitest 단위 테스트 추가
- `eco.bat`에 `test`, `lint` 명령 추가로 단일 진입점 DX 강화

---

## 🛠️ Step-by-Step Execution Plan

### 📦 Task List

- [ ] **Task 1: backend/tests/ conftest.py 구성**
  - **Goal**: 현재 conftest.py 없는 `backend/tests/`에 공통 픽스처 기반 구성
  - **Context**: `backend/tests/` (현재 테스트 파일 12개, conftest.py 없음)
  - **Implementation**:
    - [ ] `backend/tests/conftest.py` 생성:
      - `AsyncClient` 픽스처 (`httpx.AsyncClient` + `ASGITransport`)
      - Supabase Mock 픽스처 (`unittest.mock.AsyncMock`)
      - 공통 테스트 데이터 픽스처 (`sample_admission`, `sample_vital`)
    - [ ] 기존 테스트 파일 12개를 conftest 픽스처 활용하도록 점진적 리팩토링
    - [ ] `pytest.ini` 또는 `pyproject.toml [tool.pytest]` 설정 추가
  - **Pseudocode**:
    ```python
    # conftest.py
    import pytest
    from httpx import AsyncClient, ASGITransport
    from unittest.mock import AsyncMock, patch
    from main import app

    @pytest.fixture
    async def client():
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            yield ac

    @pytest.fixture
    def mock_supabase():
        with patch("dependencies.get_supabase") as mock:
            mock.return_value = AsyncMock()
            yield mock.return_value
    ```
  - **Dependency**: None
  - **Verification**: `pytest backend/tests/ -v --tb=short` 실행 후 수집된 테스트 수 기존 이상

- [ ] **Task 2: 핵심 라우터 통합 테스트 작성**
  - **Goal**: vitals / meals / iv_records 라우터의 Happy Path + Error Path 테스트
  - **Context**: `backend/routers/vitals.py`, `meals.py`, `iv_records.py`
  - **Implementation**:
    - [ ] `backend/tests/test_vitals_integration.py`:
      - `POST /api/v1/vitals/` — 정상 체온 기록 (201)
      - `POST /api/v1/vitals/` — 인증 없음 (401/403)
      - `POST /api/v1/vitals/` — 유효하지 않은 온도값 (422)
    - [ ] `backend/tests/test_meals_integration.py`:
      - `POST /api/v1/meals/` — 식단 신청 정상 (201)
      - `POST /api/v1/meals/` — 중복 신청 처리
    - [ ] `backend/tests/test_iv_records_integration.py`:
      - `POST /api/v1/iv-records/` — 수액 기록 정상 (201)
    - [ ] Mock 전략: Supabase AsyncClient를 `AsyncMock`으로 대체 (외부 DB 의존성 제거)
  - **Pseudocode**:
    ```python
    # test_vitals_integration.py
    import pytest
    from httpx import AsyncClient

    @pytest.mark.asyncio
    async def test_record_vital_success(client: AsyncClient, mock_supabase):
        mock_supabase.table.return_value.insert.return_value.execute = AsyncMock(
            return_value=MockResponse(data=[{"id": "uuid", "temperature": 37.5}])
        )
        response = await client.post(
            "/api/v1/vitals/",
            json={"admission_id": "test-id", "temperature": 37.5, "has_medication": False},
            headers={"Authorization": "Bearer test-token"},
        )
        assert response.status_code == 201
        assert response.json()["temperature"] == 37.5
    ```
  - **Dependency**: Task 1 완료 후
  - **Verification**: `pytest backend/tests/test_vitals_integration.py -v` 통과

- [ ] **Task 3: pytest 설정 및 커버리지 리포트 구성**
  - **Goal**: `pyproject.toml`에 pytest 설정 추가, 커버리지 80% 목표 설정
  - **Context**: `backend/pyproject.toml`
  - **Implementation**:
    - [ ] `[tool.pytest.ini_options]` 섹션 추가:
      ```toml
      asyncio_mode = "auto"
      testpaths = ["tests"]
      addopts = "-v --tb=short"
      ```
    - [ ] `[tool.coverage.run]` 섹션 추가:
      ```toml
      source = ["routers", "services"]
      omit = ["tests/*", "scripts/*", "debug_*.py"]
      ```
    - [ ] `pytest-asyncio` 의존성 확인 (없으면 dev 그룹에 추가)
  - **Dependency**: Task 1 완료 후
  - **Verification**: `pytest --cov=routers --cov-report=term-missing` 실행 후 커버리지 리포트 출력

- [ ] **Task 4: 프론트엔드 Vitest 환경 구성**
  - **Goal**: `frontend/`에 Vitest + Testing Library 설치 및 기본 설정
  - **Context**: `frontend/` (현재 테스트 환경 없음)
  - **Implementation**:
    - [ ] 패키지 설치 확인 (중복 설치 방지):
      ```bash
      grep -r "vitest\|@testing-library" frontend/package.json
      ```
    - [ ] 없을 경우 설치:
      ```bash
      pnpm add -D vitest @testing-library/react @testing-library/user-event jsdom @vitejs/plugin-react
      ```
    - [ ] `frontend/vitest.config.ts` 생성:
      ```typescript
      import { defineConfig } from 'vitest/config'
      export default defineConfig({
        test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'] },
      })
      ```
    - [ ] `frontend/src/test/setup.ts` 생성 (`@testing-library/jest-dom` 임포트)
  - **Dependency**: None
  - **Verification**: `pnpm test --run` 실행 후 설정 파일 오류 없음

- [ ] **Task 5: 프론트엔드 핵심 컴포넌트 단위 테스트**
  - **Goal**: `MealRequestModal`, `api.ts` deduplication 로직 테스트
  - **Context**: `frontend/src/components/`, `frontend/src/lib/api.ts`
  - **Implementation**:
    - [ ] `frontend/src/lib/__tests__/api.test.ts`:
      - POST 중복 요청 deduplication 검증
      - 동일 키로 2번 호출 시 단일 fetch만 발생하는지 확인
    - [ ] `frontend/src/components/__tests__/MealRequestModal.test.tsx`:
      - 렌더링 성공 (smoke test)
      - 버튼 클릭 시 `onClose` 호출 확인
      - 타입 선택 UI 인터랙션 확인
    - [ ] Tauri API Mock: `vi.mock('@tauri-apps/api/event', () => ({ emit: vi.fn(), listen: vi.fn() }))`
  - **Pseudocode**:
    ```typescript
    // api.test.ts
    it('동일 POST 요청 중복 호출 시 fetch 1회만 실행', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'))
      const [r1, r2] = await Promise.all([
        api.post('/test', { key: 'val' }),
        api.post('/test', { key: 'val' }),
      ])
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })
    ```
  - **Dependency**: Task 4 완료 후
  - **Verification**: `pnpm test --run` 전체 통과

- [ ] **Task 6: eco.bat `test` / `lint` 명령 추가**
  - **Goal**: `eco test`, `eco lint` 단일 명령으로 전체 테스트·린트 실행
  - **Context**: `eco.bat` (프로젝트 루트)
  - **Implementation**:
    - [ ] `eco test` → `cd backend && uv run pytest --cov=routers -v` + `cd frontend && pnpm test --run`
    - [ ] `eco lint` → `cd backend && uv run ruff check --fix && uv run ruff format` + `cd frontend && pnpm tsc --noEmit`
    - [ ] `scripts/Run-Tests.ps1` 작성 (백엔드 + 프론트엔드 순차 실행, 결과 합산 출력)
    - [ ] `eco.bat` 메뉴 항목 추가 (기존 번호 이후에 삽입)
  - **Pseudocode**:
    ```bat
    IF "%1"=="test" (
        powershell -ExecutionPolicy Bypass -File "%~dp0scripts\Run-Tests.ps1"
        EXIT /B %ERRORLEVEL%
    )
    IF "%1"=="lint" (
        powershell -ExecutionPolicy Bypass -File "%~dp0scripts\Run-Lint.ps1"
        EXIT /B %ERRORLEVEL%
    )
    ```
  - **Dependency**: Task 3, Task 5 완료 후
  - **Verification**: `eco test` 실행 → 백엔드 + 프론트엔드 테스트 결과 통합 출력

---

## ⚠️ 기술적 제약 및 규칙 (SSOT)

- **Supabase Mock 필수**: 실제 DB 연결 없는 환경에서 CI 실행 가능해야 함. 모든 통합 테스트는 `AsyncMock` 기반.
- **Tauri Mock**: 프론트엔드 테스트에서 `@tauri-apps/api/*` 전체 모킹 필수 (`vi.mock` 사용).
- **인코딩**: `scripts/Run-Tests.ps1`은 `.NET [System.IO.File]::WriteAllText` 기반 출력. PowerShell 기본 명령 사용 금지.
- **pytest-asyncio**: `asyncio_mode = "auto"` 설정으로 `@pytest.mark.asyncio` 데코레이터 생략 가능.

## ✅ Definition of Done

1. [ ] `pytest backend/tests/ -v` → 핵심 라우터 테스트 80% 이상 통과
2. [ ] `pnpm test --run` → Vitest 단위 테스트 전체 통과
3. [ ] `eco test` 단일 명령으로 백엔드 + 프론트엔드 테스트 일괄 실행
4. [ ] `eco lint` 단일 명령으로 ruff + tsc 린트 일괄 실행
