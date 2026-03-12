# 🗺️ Project Blueprint: Phase 4-A — 백엔드 의존성 감사 & 라우터 구조 개선
> 생성 일시: 2026-03-12 | 상태: 설계 승인 대기

## 🎯 Architectural Goal
- `pyproject.toml`에 혼재된 163개 의존성을 코어/도구/개발 그룹으로 분리하여 배포 이미지 경량화
- 웹 API와 무관한 `selenium`, `flet`, `google-generativeai`, `pandas` 등을 `tools` 그룹으로 격리
- 모든 FastAPI 라우터에 `response_model` + `status_code` + `summary` 명시로 OpenAPI 문서 완성도 향상
- Pydantic v2 `model_validator` 미활용 부분 식별 및 개선

---

## 🛠️ Step-by-Step Execution Plan

### 📦 Task List

- [x] **Task 1: 의존성 분류 목록 작성 (감사)**
  - **Goal**: 163개 패키지를 core / dev / tools 3개 버킷으로 분류한 목록 도출
  - **Context**: `backend/pyproject.toml` 전체
  - **Implementation**:
    - [ ] **Core (프로덕션 필수)** 식별: `fastapi`, `uvicorn`, `pydantic`, `supabase`, `loguru`, `realtime`, `websockets`, `python-dotenv`, `python-multipart`, `httpx`, `starlette`, `qrcode`, `pillow`, `pywin32`, `cryptography`, `pyjwt`
    - [ ] **Dev (테스트/린트)** 식별: `pytest`, `pytest-cov`, `mypy`, `pylint`, `ruff`, `httpx`, `coverage`
    - [ ] **Tools (스크립트 전용)** 식별: `selenium`, `undetected-chromedriver`, `webdriver-manager`, `flet`, `flet-cli`, `flet-desktop`, `customtkinter`, `darkdetect`, `google-generativeai`, `google-api-python-client`, `pandas`, `numpy`, `openpyxl`, `pyhwp`, `pyhwpx`, `pymupdf`, `pyinstaller`, `playwright` 계열
    - [ ] **Unknown/Transitive** 표시 (직접 import 없는 패키지 별도 확인)
  - **Pseudocode**:
    ```
    for each package in pyproject.toml:
        grep -r "import {package}" backend/ --include="*.py"
        if no direct import → mark as transitive/unused
    ```
  - **Dependency**: None
  - **Verification**: 분류 결과를 `docs/plans/phase4a-dep-audit-result.md`에 저장 후 사용자 확인

- [x] **Task 2: pyproject.toml 그룹 분리 적용**
  - **Goal**: core / dev / tools 그룹을 `[dependency-groups]`로 물리적으로 분리
  - **Context**: `backend/pyproject.toml`
  - **Implementation**:
    - [x] `[project].dependencies` → Core 50개만 유지 (버전 핀 유지)
    - [x] `[dependency-groups].dev` → 기존 dev + 테스트/린트 15개 추가
    - [x] `[dependency-groups].tools` → 스크립트 전용 93개 이동
    - [x] `uv lock` 실행 → 158 packages resolved (annotated-doc, strenum 등 5개 orphan 제거)
  - **Pseudocode**:
    ```toml
    [project]
    dependencies = ["fastapi==...", "uvicorn==...", ...]  # Core only

    [dependency-groups]
    dev = ["pytest==...", "mypy==...", ...]
    tools = ["selenium==...", "flet==...", "pandas==...", ...]
    ```
  - **Dependency**: Task 1 완료 후
  - **Verification**: `uv run --no-group tools --no-group dev python -c "import fastapi; import uvicorn; print('OK')"` 성공 확인

- [x] **Task 3: Core-only 환경에서 서버 기동 테스트**
  - **Goal**: tools/dev 그룹 없이도 백엔드가 정상 기동되는지 검증
  - **Context**: `backend/main.py`
  - **Implementation**:
    - [x] `uv run --no-group tools --no-group dev uvicorn main:app` 실행
    - [x] import 오류 없이 기동 확인 (`Started server process` 로그 확인)
    - [ ] scripts/가 tools 그룹 패키지를 사용하는 경우 `uv run --group tools python scripts/xxx.py` 패턴으로 전환
  - **Dependency**: Task 2 완료 후
  - **Verification**: 서버 기동 로그에서 ImportError 0개 확인

- [x] **Task 4: FastAPI 라우터 `response_model` / `status_code` 전수 명시**
  - **Goal**: 모든 엔드포인트에 응답 스키마 선언 → OpenAPI `/docs` 완성도 확보
  - **Context**: `backend/routers/` 하위 7개 파일
  - **Implementation**:
    - [ ] `vitals.py`: `@router.post("", response_model=VitalSign)` → `status_code=201`, `summary` 추가
    - [ ] `meals.py`: 각 엔드포인트 `response_model` + `status_code` 확인 및 추가
    - [ ] `iv_records.py`: 동일 패턴 적용
    - [ ] `admissions.py`: 동일 패턴 적용
    - [ ] `exams.py`: 동일 패턴 적용
    - [ ] `station.py`: 동일 패턴 적용
    - [ ] `dev.py`: 개발 전용 라우터 — 프로덕션 비활성화 조건 확인 (`DEV_MODE` 환경변수 가드)
  - **Pseudocode**:
    ```python
    @router.post(
        "/",
        response_model=VitalSign,
        status_code=201,
        summary="체온·투약 기록 생성",
    )
    async def record_vital(...) -> VitalSign:
        ...
    ```
  - **Dependency**: None (Task 1~3과 병렬 진행 가능)
  - **Verification**: `uvicorn main:app` 기동 후 `GET /docs` → 모든 엔드포인트에 응답 스키마 표시 확인

- [ ] **Task 5: Pydantic v2 모델 개선 (model_validator)**
  - **Goal**: `models.py` / `schemas.py`에서 v1 스타일 validator를 v2 `model_validator`로 전환
  - **Context**: `backend/models.py`, `backend/schemas.py`
  - **Implementation**:
    - [ ] `@validator` (v1) → `@model_validator(mode='after')` (v2) 패턴 식별
    - [ ] `dict()` 호출 → `model_dump()` 전환 (routers 내 `.dict()` 호출 포함)
    - [ ] `orm_mode = True` → `model_config = ConfigDict(from_attributes=True)` 전환
  - **Pseudocode**:
    ```python
    # Before (v1)
    class VitalSignCreate(BaseModel):
        @validator('temperature')
        def validate_temp(cls, v): ...

    # After (v2)
    class VitalSignCreate(BaseModel):
        @model_validator(mode='after')
        def validate_temp(self) -> 'VitalSignCreate': ...
    ```
  - **Dependency**: None
  - **Verification**: `mypy backend/` 실행 후 타입 오류 0개

---

## ⚠️ 기술적 제약 및 규칙 (SSOT)

- **Encoding**: UTF-8 no BOM. `pyproject.toml` 수정 시 BOM 미삽입 교차 검증 필수.
- **uv lock**: 의존성 변경 후 반드시 `uv lock` 실행 → `uv.lock` SSOT 유지.
- **Refactoring**: 라우터 로직 변경 금지. 데코레이터 메타데이터 추가만 허용.
- **dev.py**: 프로덕션 노출 여부 반드시 확인. `DEV_MODE` 가드 없으면 Task 4에서 경고 표시.

## ✅ Definition of Done

1. [x] `uv run --no-group tools --no-group dev uvicorn main:app` 정상 기동
2. [x] 7개 라우터 전 엔드포인트 `response_model` / `status_code` / `summary` 명시 완료
3. [ ] `mypy backend/` 오류 0개
4. [x] `uv.lock` 갱신 완료
