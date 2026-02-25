# Eco-Pediatrics Guardian Dashboard (에코 소아과 보호자 대시보드)

소아과 병동 입원 환아 보호자와 간호 스테이션을 위한 실시간 의료 모니터링 및 커뮤니케이션 플랫폼입니다.

## 🌟 프로젝트 소개

보호자는 스마트폰(QR 접속)으로 언제 어디서나 자녀의 체온, 수액 상태, 식단, 검사 일정을 확인할 수 있으며, 간호 스테이션은 병동 전체 현황을 실시간으로 관제하고 효율적으로 관리할 수 있습니다.

## 🚀 최신 업데이트 및 주요 기능 (2026-02-22 기준)

### 1. 백엔드/DB 안정화 (2026-02-22)
*   **Supabase update/select 2단계 패턴**: `station.py` 식단·서류 상태 변경 시 `AsyncFilterRequestBuilder` 에러(update 후 .select() 체이닝 미지원) 해결. update 실행 후 별도 select로 브로드캐스트 데이터 조회. (`docs/TROUBLESHOOTING.md` §10, `docs/CRITICAL_LOGIC.md` §2.4)
*   **간호 스테이션 완료 서류 미표시 수정**: useVitals 시퀀스 가드·api.ts dedup 충돌 해결. `force: true` 응답 우선 적용, 빈 응답 처리 강화. (`docs/TROUBLESHOOTING.md` §12, `docs/prompts/PROMPT_COMPLETED_DOCS_NOT_SHOWING.md`)
*   **수액 주입 속도 소수점 지원**: `IVRecord`/`IVRecordCreate.infusion_rate`를 `float`으로 변경, DB `iv_records.infusion_rate`를 `NUMERIC` 마이그레이션으로 정밀도 충돌(22P02) 해소.
*   **뷰/보안 컬럼 마이그레이션**: `view_station_dashboard` 재생성 시 `token_expires_at` 컬럼 부재(42703) 방지를 위해 **컬럼 추가 → 뷰 재생성** 순서를 보장하는 통합 마이그레이션 적용. (`supabase/migrations/20260222_view_token_expires_fix.sql`)
*   **전역 Traceback 로깅**: `main.py` 예외 핸들러에 `traceback.format_exc()` 추가로 미처리 예외 발생 시 정확한 파일·라인 추적 가능.
*   **BAD 패턴 검출**: `backend/search_error.py`로 update/delete 후 .select() 체이닝 패턴 전수 검사.

### 2. 성능 및 시스템 최적화
*   **Supabase 쿼리 지연 해결**: `utils.py`의 `AttributeError`로 인한 불필요한 재시도 루프(약 3.5초 지연)를 제거하여 API 응답 속도 정상화.
*   **Frontend API 캐싱**: Tauri 플러그인 동적 로드 오버헤드를 최소화하기 위해 모듈 레벨에서 `fetch` 및 `log` 함수를 캐싱하여 병렬 요청 효율성 증대.

### 3. 데이터 정합성 및 안정성 (Idempotency)
*   **서류 요청 중복 방지**: 동일 항목에 대한 중복 신청을 백엔드(DB 레벨 체크)와 프론트엔드(체크박스 비활성화) 양단에서 차단.
*   **검사 일정 복구 로직**: 삭제 후 동일 ID 재생성 시 발생하던 충돌을 해결하고, SQL 스크립트에 `DROP POLICY IF EXISTS` 등 멱등성 보강.
*   **아키텍처 정규화 및 방어적 검증**: RPC 응답 표준화(`normalize_rpc_result`) 및 Pydantic/Frontend 이중 유효성 검사 도입으로 시스템 견고함 증대 (2026-02-19).

### 4. UI/UX 고도화 및 알림 최적화
*   **스마트 알림 제어**: 업무 몰입도 향상을 위해 서류 신청 알림을 실시간 알림창에서 제외하고, 환자 상세페이지의 '현황' 목록으로 관리 일원화.
*   **스테이션 시인성 개선**: 퇴원, 전실, Dev 버튼 등에 테두리 스타일링을 추가하고, 보호자 대시보드 헤더의 'DEV: 환자추가' 기능 등으로 테스트 편의성 강화.

### 5. 보안 및 권한 체계 (RLS)
*   **Meal Requests CRUD 완전 자율화**: 식단 편집 시 발생하는 500 오류를 해결하기 위해 `meal_requests` 테이블에 `INSERT/UPDATE` 정책을 보강.
*   **상태 기반 권한 제어**: `IN_PROGRESS` 뿐만 아니라 `OBSERVATION` 환자에 대해서도 일관된 보안 정책 적용.

### 6. 개발 생산성 및 모니터링 혁신
*   **Zero-Cost Full-Stack Error Monitor**: 별도의 상용 툴(Sentry 등) 없이 Python 스크립트 하나로 Backend/Frontend/DB 에러를 실시간 감지하고 LLM 디버깅 컨텍스트를 자동 생성.
*   **통합 개발 터미널**: `eco dev` 실행 한 번으로 Backend, Frontend, Error Monitor가 최적의 레이아웃으로 실행되는 환경 구축.

| 분류 | 세부 기능 설명 |
| :--- | :--- |
| **보호자 대시보드** | 별도의 로그인 없는 **QR 코드 접속**, 실시간 체온/수액 모니터링, 해열제 투여 시점 시각화. |
| **간호 스테이션** | 병동 전체 현황 관제, 환자 상세 관리, 전실/퇴원 처리 및 실시간 요청 컨펌. |
| **통합 식단 관리** | 환아/보호자 식사 신청, 스테이션용 통합 식단 그리드 및 비고란 실시간 동기화. |
| **실시간 동기화** | WebSocket 기반 100% 실시간 앱 상태 동기화 및 자동 재연결. |

## 🛠 기술 스택

| 분류 | 기술 |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), Tailwind CSS v4, Lucide React, Recharts, Framer Motion |
| **Backend** | FastAPI (Python 3.14+), WebSockets, Loguru, Pydantic |
| **Database** | Supabase (PostgreSQL), Row Level Security (RLS) |
| **Infra/DevOps** | Batch Scripts (Windows), Docker (Optional), `error_monitor.py` (Zero-Cost Error Monitoring) |

## 🏗 시스템 아키텍처 (Refactored 2026-02-19)

본 프로젝트는 **Layered Architecture**를 따르며, 유지보수성과 확장성을 고려하여 설계되었습니다.

*   **Backend**: `routers`(도메인 진입) -> `services`(비즈니스 로직) -> `utils`(공통 기능) 구조로 분리.
    *   **Global Error Handling**: 표준화된 예외 처리 및 구조화된 로깅 도입.
    *   **Data Integrity**: Pydantic 모델을 통한 엄격한 입출력 검증.
*   **Frontend**: `hooks`(상태/로직) -> `components`(UI) -> `lib/api`(통신) 계층화.
    *   **WebSocket Resilience**: 연결 끊김 시 자동 재연결 및 상태 복구 로직 내장.

## 💻 시작 가이드 (Getting Started)

### 사전 요구사항
*   Python 3.14+
*   Node.js 24+
*   Supabase 프로젝트 (URL/Key)

### 설치 및 실행

1.  **환경 변수 설정**:
    *   `backend/.env` (참고: `backend/.env.example`)
    *   `frontend/.env.local`

2.  **통합 실행 (Recommended)**:
    ```bash
    eco dev
    # 백엔드(8000)와 프론트엔드(3000)가 동시에 실행됩니다.
    ```

3.  **개별 실행 (Manual)**:
    *   **Backend**: `cd backend && python -m uvicorn main:app --reload`
    *   **Frontend**: `cd frontend && npm run dev`

4.  **Tauri 앱 실행 (데스크톱)**:
    ```bash
    cd frontend
    npm run tauri dev
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
