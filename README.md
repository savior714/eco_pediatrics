# Eco-Pediatrics Guardian Dashboard (에코 소아과 보호자 대시보드)

소아과 병동 입원 환아 보호자와 간호 스테이션을 위한 실시간 의료 모니터링 및 커뮤니케이션 플랫폼입니다.

## 🌟 프로젝트 소개

보호자는 스마트폰(QR 접속)으로 언제 어디서나 자녀의 체온, 수액 상태, 식단, 검사 일정을 확인할 수 있으며, 간호 스테이션은 병동 전체 현황을 실시간으로 관제하고 효율적으로 관리할 수 있습니다.

## 🚀 최신 업데이트 및 주요 기능 (2026-03-02 기준)

### 1. Ark UI 전면 도입 및 UI 고도화 (Phase 3 완료)
*   **Headless UI 전환**: @ark-ui/react를 활용하여 모달(Modal), 셀렉터(Select), 탭(Tabs), 입력 폼(Field, NumberInput) 등의 프리미티브를 Ark UI 기반으로 전면 리팩토링.
*   **프리미엄 인터랙션 (Toast/Popover)**: 기존 alert을 대체하는 고급 토스트 시스템 및 상세 정보 팝오버 도입.
*   **접근성 및 성능**: WAI-ARIA 표준 준수 및 unmountOnExit 적용으로 대규모 모달(PatientDetailModal)의 메모리 점유 최적화.

### 2. 수액 라벨 인쇄 시스템 및 Tauri Bridge (신규)
*   **Brother b-PAC SDK 연동**: Tauri Bridge(Rust)를 통해 Brother TD-4520DN 프린터와 직접 통신하여 수액 라벨지 인쇄 기능 구현.
*   **실시간 속도 환산 로직**: cc/hr 단위를 gtt/min(Micro: 1:1, Standard: 3:1)으로 자동 계산하는 임상 로직 통합.
*   **레이어드 미리보기**: 인쇄 전 실시간 데이터가 매핑된 라벨 이미지를 확인할 수 있는 전용 프리뷰 모달 구축. (Z-Index elevation="nested" 적용)

### 3. UV Native 및 통합 도구 관리 (Standard)
*   **UV 기반 의존성 제어**: pip/venv 혼용을 중단하고 uv를 활용한 결정론적 빌드 및 초고속 패키지 설치 환경 구현.
*   **프론트엔드 툴체인 격리**: uv run --with nodejs npm ... 형식을 채택하여 Node.js 버전 및 도구 체인의 일관성 확보.
*   **통합 런처 고도화**: eco.bat 및 start_backend_pc.bat을 uv run 기반으로 리팩토링하여 활성화 과정 없는 즉각적인 실행 보장.

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
    # 또는 eco.bat 실행 후 [2] 선택. PowerShell(Setup-Environment.ps1)이 uv venv, SDK 탐색, backend/frontend 의존성 일괄 설치 수행
    ```
    *   창이 바로 닫히면: `pwsh -File scripts\Fix-BatEncoding.ps1` 실행 후 eco.bat 재실행.

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

*   **[docs/README.md](./docs/README.md) — 전체 문서 인덱스 (가장 먼저 확인할 곳)**
*   **[docs/memory.md](./docs/memory.md)** — **실시간 작업 맥락 및 히스토리 SSOT** ([Strict Append-Only] 로그)
*   **[docs/CRITICAL_LOGIC.md](./docs/CRITICAL_LOGIC.md)** — **시스템 핵심 운영 로직 SSOT (프로젝트 헌법)**
*   **[docs/DEV_ENVIRONMENT.md](./docs/DEV_ENVIRONMENT.md)** — UV Native 환경 구축 및 `eco.bat` 실행 가이드
*   **[docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** — 알려진 문제 및 해결 가이드 (설정, Doctor, WT 레이아웃 등)
*   **[docs/WORKFLOW_30MIN_AI_CODING.md](./docs/WORKFLOW_30MIN_AI_CODING.md)** — 30분 AI 코딩 워크플로우 절차 가이드
*   **[docs/archive/](./docs/archive/)** — 완료된 계획서 및 특정 이슈 레거시 로그 보관함
