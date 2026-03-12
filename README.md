# Eco-Pediatrics Guardian Dashboard (에코 소아과 보호자 대시보드)

소아과 병동 입원 환아 보호자와 간호 스테이션을 위한 실시간 의료 모니터링 및 커뮤니케이션 플랫폼입니다.

## 🌟 프로젝트 소개

보호자는 스마트폰(QR 접속)으로 언제 어디서나 자녀의 체온, 수액 상태, 식단, 검사 일정을 확인할 수 있으며, 간호 스테이션은 병동 전체 현황을 실시간으로 관제하고 효율적으로 관리할 수 있습니다.

## 🚀 최신 업데이트 및 주요 기능

### 1. Ark UI 전면 도입 및 UI 고도화 (Phase 3 완료)
*   **Headless UI 전환**: `@ark-ui/react`를 활용하여 모달, 셀렉터, 탭, 입력 폼 등의 프리미티브를 Ark UI 기반으로 전면 리팩토링하여 접근성(Accessibility)과 상태 관리의 일관성 확보.
*   **성능 최적화 (Scoped Imports)**: Ark UI 컴포넌트 임포트 방식을 Scoped Import(`@ark-ui/react/dialog` 등)로 개편하여 트리쉐이킹 효율 극대화 및 빌드 사이즈 최적화.

### 2. 백엔드 아키텍처 현대화 (Standard)
*   **FastAPI Annotated DI**: 모든 엔드포인트의 의존성 주입 패턴을 `Annotated[T, Depends()]`로 전면 교체하여 유형 안정성 및 가독성 향상.
*   **Supabase v2 SDK 최적화**: 레거시 임포트(`supabase._async.client`)를 제거하고 공식 v2 규격(`AsyncClient`, `create_async_client`)으로 전수 교체하여 라이브러리 호환성 확보.
*   **Python 3.14 호환성**: 최신 Python 표준 컬렉션 타입(`list[T]`) 적용 및 비동기 루프 최적화.

### 3. 수액 라벨 인쇄 시스템 및 Tauri Bridge
*   **Brother b-PAC SDK 연동**: Tauri Bridge(Rust)를 통해 Brother TD-4520DN 프린터와 직접 통신하여 수액 라벨지 인쇄 기능 구현.
*   **실시간 속도 환산 로직**: `cc/hr` 단위를 `gtt/min`으로 자동 계산하는 임상 로직 통합.
*   **레이어드 미리보기**: 인쇄 전 실시간 데이터가 매핑된 라벨 이미지를 확인할 수 있는 전용 프리뷰 모달 구축.

### 4. 스킬셋 슬림화 및 컨텍스트 최적화
*   **Repomix 단일 체제**: 파편화된 다수의 스킬을 폐기하고 `repomix` 중심으로 스킬셋을 통합하여 에이전트의 컨텍스트 노이즈를 최소화하고 작업 효율성 극대화.
*   **플러그인 구조**: `plugins/repomix`를 통해 프로젝트 맞춤형 코드베이스 덤프 기능을 상시 지원.

---

## 🛠 기술 스택

| 분류 | 기술 |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), **Ark UI**, Tailwind CSS, Lucide React, Framer Motion |
| **Backend** | FastAPI (Python 3.14+), **UV Native**, WebSockets, Pydantic |
| **Database** | Supabase (PostgreSQL), RLS |
| **DevOps** | Batch Scripts, **uv**, `plugins/repomix/` |

---

## 🚀 시작 가이드 (Getting Started)

1.  **환경 세팅 (Setup)**:
    ```bash
    .\eco.bat setup
    # 또는 PowerShell: .\scripts\Setup-Environment.ps1 -ProjectRoot .
    ```
    *   `uv venv` 생성, SDK 탐색, backend/frontend 의존성을 일괄 설치합니다.

2.  **통합 실행 (Dev Mode)**:
    ```bash
    .\eco.bat dev
    # Backend(uv run), Frontend(npm run dev)가 Windows Terminal에서 동시 실행됩니다.
    ```

---

## 📂 문서 체계 (Documentation)

모든 문서는 `docs/` 폴더 내에 위치하며, **SSOT(Single Source of Truth)** 원칙을 준수합니다.

### 1. 핵심 문서 (Core)
*   **[docs/README.md](./docs/README.md) — 전체 문서 인덱스 (가장 먼저 확인할 곳)**
*   **[docs/memory.md](./docs/memory.md)** — **실시간 작업 맥락 및 히스토리 SSOT** (Append-Only)
*   **[docs/CRITICAL_LOGIC.md](./docs/CRITICAL_LOGIC.md)** — **시스템 핵심 운영 로직 SSOT (프로젝트 헌법)**
*   **[docs/DEV_ENVIRONMENT.md](./docs/DEV_ENVIRONMENT.md)** — UV Native 환경 구축 및 인코딩 원칙 가이드

### 2. 아키텍처 및 상세 시스템
*   **[docs/ARCHITECTURAL_PLAN.md](./docs/ARCHITECTURAL_PLAN.md)** — 상위 레벨 아키텍처 설계
*   **[docs/IV_LABEL_PRINTING_SYSTEM.md](./docs/IV_LABEL_PRINTING_SYSTEM.md)** — 수액 라벨 인쇄 시스템 및 환산 공식
*   **[docs/DEVELOPMENT_STANDARDS.md](./docs/DEVELOPMENT_STANDARDS.md)** — 코딩 규격 및 디자인 시스템 표준

### 3. 검증 및 트러블슈팅
*   **[docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** — 알려진 문제 및 해결 가이드
*   **[docs/VERIFICATION_GLOBAL_RULES.md](./docs/VERIFICATION_GLOBAL_RULES.md)** — 글로벌 룰 및 에이전트 행동 지침
*   **[docs/WORKFLOW_30MIN_AI_CODING.md](./docs/WORKFLOW_30MIN_AI_CODING.md)** — AI 코딩 파트너십 워크플로우
*   **[docs/archive/](./docs/archive/)** — 과거 로그 및 완료된 계획서 보관함

---
*Last updated: 2026-03-12 (Phase 4-A: Tasks 1~5 전체 완료 — pyproject.toml 그룹 분리, Core-only 기동 검증, 라우터 OpenAPI 메타데이터 전수 명시, Pydantic v2 전환, ruff 0 + mypy 0 달성)*
