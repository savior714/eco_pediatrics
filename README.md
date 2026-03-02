# Eco-Pediatrics Guardian Dashboard (에코 소아과 보호자 대시보드)

소아과 병동 입원 환아 보호자와 간호 스테이션을 위한 실시간 의료 모니터링 및 커뮤니케이션 플랫폼입니다.

## 🌟 프로젝트 소개

보호자는 스마트폰(QR 접속)으로 언제 어디서나 자녀의 체온, 수액 상태, 식단, 검사 일정을 확인할 수 있으며, 간호 스테이션은 병동 전체 현황을 실시간으로 관제하고 효율적으로 관리할 수 있습니다.

## 🚀 최신 업데이트 및 주요 기능 (2026-03-02 기준)

### 1. Ark UI 전면 도입 및 UI 고도화 (Phase 3 완료)
*   **Headless UI 전환**: `@ark-ui/react`를 활용하여 모달(`Modal`), 셀렉터(`Select`), 탭(`Tabs`), 입력 폼(`Field`, `NumberInput`) 등의 프리미티브를 Ark UI 기반으로 전면 리팩토링.
*   **프리미엄 인터랙션 (Toast/Popover)**: 기존 `alert`을 대체하는 고급 토스트 시스템 및 상세 정보 팝오버 도입.
*   **접근성 및 성능**: WAI-ARIA 표준 준수 및 `unmountOnExit` 적용으로 대규모 모달(`PatientDetailModal`)의 메모리 점유 최적화.

### 2. UV Native 백엔드 환경 구축
*   **UV 기반 의존성 제어**: `pip/venv` 혼용을 중단하고 `uv`를 활용한 결정론적 빌드 및 초고속 패키지 설치 환경 구현.
*   **통합 런처 고도화**: `eco.bat` 및 `start_backend_pc.bat`을 `uv run` 기반으로 리팩토링하여 활성화 과정 없는 즉각적인 실행 보장.

... (중략: 기존 업데이트 내역은 docs/CHANGELOG.md 참고)

## 🛠 기술 스택

| 분류 | 기술 |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), **Ark UI**, Tailwind CSS, Lucide React, Framer Motion |
| **Backend** | FastAPI (Python 3.14+), **UV Native**, WebSockets, Pydantic |
| **Database** | Supabase (PostgreSQL), RLS |
| **DevOps** | Batch Scripts, **uv**, `error_monitor.py` |

... (중략)

### 시작 가이드 (Getting Started)

1.  **환경 세팅**:
    ```bash
    eco setup
    # uv venv 생성, SDK 탐색, backend/frontend 의존성 일괄 설치 수행
    ```

2.  **통합 실행**:
    ```bash
    eco dev
    # uv run backend & npm run tauri dev & error_monitor 동시 실행
    ```

3.  **개별 실행 (Backend)**:
    ```bash
    cd backend
    uv run uvicorn main:app --reload
    ```
    *주의: Tauri v2 권한 설정 변경 시 앱을 완전히 종료 후 재실행해야 합니다.*

### 테스트 데이터 생성 (Seeding)
개발 편의를 위해 더미 데이터를 생성할 수 있습니다.

*   **전체 데이터 생성**: `POST /api/v1/seed/full-test-data` (입원, 바이탈, 검사 일정 포함)
*   **병상 데이터 생성**: `POST /api/v1/seed/station-admissions`
*   **단일 더미 환자 생성**: 스테이션 UI 'DEV: 환자추가' 버튼 (API: `POST /api/v1/dev/seed-single`)
*   **식단 일괄 생성**: 스테이션 '식단 관리' 탭 내 '식단 일괄 생성 (Dev)' 버튼 (API: `POST /api/v1/dev/seed-meals?target_date=YYYY-MM-DD`)

## 📂 문서 (Documentation)

*   [CONTEXT_SNAPSHOT.md](./CONTEXT_SNAPSHOT.md): 프로젝트의 상세 개발 현황 및 히스토리 (최신)
*   [docs/CRITICAL_LOGIC.md](./docs/CRITICAL_LOGIC.md): **시스템 핵심 운영 로직 SSOT (프로젝트 헌법)**
*   [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md): 주요 이슈 및 해결 가이드 (설정, Doctor, WT 레이아웃, Supabase 쿼리 패턴 등)
*   [docs/prompts/](./docs/prompts/): 에러 모니터 출력(`prompt_for_gemini.md`), LLM 디버깅용 프롬프트, **30분 AI 코딩** 복붙용(`WORKFLOW_30MIN_PROMPTS.md` — eco_pediatrics 전용)
*   [docs/WORKFLOW_30MIN_AI_CODING.md](./docs/WORKFLOW_30MIN_AI_CODING.md): 30분 AI 코딩 워크플로우(복붙 절차). 복붙용 프롬프트는 [docs/prompts/WORKFLOW_30MIN_PROMPTS.md](./docs/prompts/WORKFLOW_30MIN_PROMPTS.md)(eco_pediatrics 전용).
*   [NEXT_STEPS.md](./NEXT_STEPS.md): 향후 개발 계획
