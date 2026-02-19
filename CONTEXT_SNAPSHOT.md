# Context Snapshot

- **Zero-Cost Full-Stack Error Monitoring (2026-02-19)**:
    - **통합 감시 아키텍처**: Frontend, Backend, Database(간접) 에러를 `error_monitor.py` 하나로 실시간 감지하는 Pure-Python 솔루션 구축.
    - **Tauri/Next.js 호환성**: `frontend.log` (UTF-16 LE) 인코딩 자동 감지 및 React/Next.js 고유 에러 패턴 매칭 지원.
    - **터미널 레이아웃 고도화 (Final Fix)**: Windows Terminal 1.23+ 버전의 비동기 실행으로 인한 레이아웃 깨짐(Race Condition)을 `move-focus down` 명령으로 물리적 포커스를 강제 이동시켜 완벽하게 해결. (상:모니터 / 하:개발환경 반반)
    - **LLM Context Automation**: 에러 발생 시 `prompt_for_gemini.md`에 관련 소스 코드(Language Tagging 포함)와 에러 로그를 즉시 패키징하여 디버깅 시간 단축.

- **운영 안정성 및 대시보드 최적화 (2026-02-19)**:
    - **더미 데이터 품질 개선**: 더미 환자 이름에서 무작위 숫자를 제거하고 현실적인 성함 생성 및 표준 마스킹 규칙(`mask_name`)을 RPC 레이어까지 적용.
    - **서류 신청 알림 복구**: `useStation.ts` 내 누락된 `NEW_DOC_REQUEST` 처리 로직을 복구하여 간호 스테이션 사이드바에 실시간 알람 표시.
    - **알람 지속성(Persistence) 확보**: `pending-requests` 전용 엔드포인트 및 서비스를 구축하여 페이지 새로고침이나 웹소켓 재연결 시에도 미결제 알람 목록 유지.
    - **중복 신청 방어 강화**: 대시보드 모달에서 `PENDING`뿐만 아니라 이미 완료된 서류 항목도 비활성화 처리하여 불필요한 재신청 방지.
    - **쿼리 아키텍처 최적화**: `fetch_dashboard_data` 내 모든 `select("*")`를 명시적 컬럼 선택(`Explicit Column Selection`)으로 변경하여 페이로드 최적화 및 DB 효율 향상.

- **아키텍처 정규화 및 방어적 검증 (2026-02-19)**:
    - **RPC 응답 정규화**: `normalize_rpc_result` 유틸리티를 전역 서비스 레이어(`transfer`, `discharge` 등)에 적용하여 데이터 일관성(SSOT) 확보.
    - **백엔드 유효성 검증**: Pydantic `field_validator`를 통해 생년월일 및 입원일시의 미래 날짜 입력을 차단하고 `422 Unprocessable Entity` 에러 표준화.
    - **프론트엔드 선검증**: API 호출 전 생년월일 유효성 체크 로직을 `useStationActions.ts`에 추가하여 불필요한 서버 요청 방지.
    - **Dev: 단일 환자 시더**: 빈 호실을 자동 탐색하여 환자 생성 및 72시간 치 풀 데이터를 원클릭으로 시딩하는 기능 구현.
- **6-핵심 이슈 안정화 (2026-02-19)**:
    - **환경 정합성**: `.env` 변수 최적화 및 `seed_all_meals` TypeError 해결
    - **유령 데이터 차단**: 검사 일정 삭제 시 `debouncedRefetch` 강제 호출로 WS 재연결 시 ghost 데이터 방어
    - **서류 동기화 완성**: `station.py` JOIN에 `access_token` 추가하여 환자 채널 실시간 브로드캐스트 보장
    - **보호자 대시보드 UX**: 퇴원 시 이중 alert 제거 및 즉시 리다이렉트(/) 구현
    - **Dev 시더 정교화**: 검사 일정 중복 브로드캐스트 제거로 이중 생성 시각 효과 해결
- **퇴원 버튼 디자인 통일 (2026-02-19)**: 퇴원 버튼에 `border-red-100` 및 `bg-white`를 적용하여 전실/Dev 버튼과 디자인 정합성 확보
- **Z-Index 이슈 해결 (2026-02-18)**: `PatientDetailModal.tsx`의 상단 섹션 `z-index`를 `z-20`으로 조정하여 IV QR 코드 및 팝오버가 가려지는 문제 해결
- **백엔드 SDK 오용 수정 (2026-02-18)**: `meal_service.py`에서 `upsert()` 후 잘못된 `.select("*")` 체이닝을 제거하여 500 Internal Server Error 해결
- **RPC 정규화 및 SSOT 강화 (2026-02-18)**: `normalize_rpc_result` 유틸리티 도입으로 Supabase RPC 응답 형식(list/object) 불일치 해결 및 `create_admission` 시 전체 필드 즉시 반환 보장
- **프론트엔드 토큰 방어 (2026-02-18)**: `useVitals.ts`에서 403/404 에러 감지 시 세션 종료 안내 및 홈(/) 리다이렉트 로직 구현
- **Audit Log & Meal Request RPC 도입**: RLS 제약을 우회하고 보안을 강화하기 위해 `SECURITY DEFINER` 기반의 RPC 함수(`log_audit_activity`, `upsert_meal_requests_admin`) 도입 및 연동 완료

## 주요 설계 결정

- **수액 단위**: 모든 수액 주입 속도는 `cc/hr` 단위 사용 (임상 현장 맞춤)
- **보호자 대시보드**: 모바일 우선(스마트폰 QR 접속), safe-area·터치 영역 44px 이상, 모달 바텀시트 스타일
- **검사 일정**: 스테이션에서만 추가 가능. 항목은 고정 8종(흉부/복부 X-Ray, 초음파, 소변/대변/혈액검사, PCR, 신속항원). 시간은 오전/오후만 선택.
- **보안**: 토큰 기반 대시보드 접근 제어, RLS 및 감사 로그

## 완료된 주요 작업

- [x] 식단 신청 모달 및 백엔드 연동
- [x] **현재 신청 식단 표시 + 변경 버튼** (대시보드 API meals 연동)
- [x] 실시간 체온 그래프 (38° 기준 구간별 색상·보간점·애니메이션 off)
- [x] 다중 서류 신청 기능 (5종 서류)
- [x] 수액 단위 cc/hr, IVRecordCreate 정합성, 사진 선택 입력
- [x] 글로벌 에러 핸들링 및 404 페이지
- [x] 간호 스테이션: 그리드 패널 클릭 → 상세 모달(체온 차트 + IV + 요청), 프린터 버튼 제거
- [x] **예정된 검사 일정**: 스테이션 환자 모달에서 목록 표시·추가(8종 선택, 오전/오후), API·DB 연동. 보호자 대시보드 "앞으로의 검사 일정"에 동일 데이터 표시
- [x] **스테이션–입원 연동**: `GET /api/v1/admissions`로 병상별 실제 admission_id 사용. 개발용 `POST /api/v1/seed/station-admissions`로 30병상 더미 입원 생성
- [x] easy_start.bat: 스크립트 경로 고정, venv, 프론트 npm install, supabase 2.25.0 고정
- [x] Next.js 14.2.35 보안 패치, .env.example 추가
- [x] TemperatureGraph 타입 에러 수정 (Recharts dot null 반환 이슈)
- [x] **UI/UX 개선**: 스테이션/대시보드 로고 적용, 레이아웃 정리, 모바일 뷰 토글 위치 변경
- [x] **체온 차트 고도화**: 끊기는 선 대신 그라데이션 적용(38도 기준), 약물 아이콘(A/I/M) 정상 표시
- [x] **통합 테스트 데이터 생성**: `/api/v1/seed/full-test-data` (입원+체온기록+검사일정 한번에 생성)
- [x] **검사 일정 동기화 수정**: 삭제 시 실시간 반영 안되던 버그 수정 (웹소켓 브로드캐스트 타겟팅 보완)
- [x] **백엔드 비동기(Async) 전환**: Supabase AsyncClient 및 FastAPI lifespan 도입으로 Windows `WinError 10035` 해결 및 성능 최적화
- [x] **Seeder UUID 수정**: `access_token` 형식을 UUID4로 변경하여 DB 제약 조건 위반(`22P02`) 해결
- [x] **Patient-Specific Dev Seeder (Phase ZA-ZB)**: 개별 환자 상세 모달에 'Dev' 버튼 추가, 72시간 치 더미 데이터(체온·수액·검사) 생성 및 모달 유지 연동
- [x] **Produiction Hardening (2026-02-18)**:
    - **Security RPC**: `audit_logs` 및 `meal_requests` 테이블에 RLS 우회용 `SECURITY DEFINER` RPC 적용. (시스템 권한으로 안전한 데이터 관리)
    - **UI Stability**: `PatientDetailSidebar.tsx`, `VitalStatusGrid.tsx` 내 중복 Key 에러 완전 해결.
    - **Meal Request System Restore**: 
        - RPC 함수(`upsert_meal_requests_admin`) 고스트 성공 현상 해결 및 물리 데이터 적재 확인.
        - `OBSERVATION` 환자 식단 가시성 확보를 위한 RLS 정책(SELECT) 정밀 보정.
        - `dev_service.py` 내 3일치 벌크 시딩 로직 고도화 (전체 환자 자동 추적 연동).
    - **Dashboard logic**: 대시보드 식단 데이터 노출 제한 해제 및 KST(UTC+9) 타임존 정합성 확보.
- [x] **Modular Refactoring for AI Context Efficiency (2026-02-17)**:

### 목표
- **코드 품질 향상**: 거대해진 `main.py`와 `Station.tsx`를 분리하여 유지보수성 확보
- **안정성 강화**: 타입 정의(`domain.ts`) 도입 및 에러 핸들링 표준화
- **확장성 확보**: Router-Service 구조 도입으로 기능 확장 용이성 확보

### 완료된 작업
1. **Backend Architecture Split**:
   - `main.py` -> `routers/`(admissions, station, iv_records, vitals, exams, dev) + `services/dashboard.py`
   - `utils.py`, `dependencies.py`, `logger.py` 분리
   - `loguru` 도입 및 전역 예외 처리(`@app.exception_handler`)

2. **Frontend Data Flow**:
   - `hooks/useStation.ts`: WebSocket 및 상태 관리 로직 분리
   - `lib/api.ts`: API 호출 로직 통합
   - `types/domain.ts`: 공통 타입 정의
   - `PatientDetailModal.tsx`: `useEffect` 의존성 최적화 및 `next/image` 적용

3. **Verification**:
   - Frontend Lint/Typecheck 통과
   - 불필요한 파일(`backend/api.py`) 정리

4. **Cleanup & Polish**:
   - **Backend**: `lifespan` 중복 초기화 방지 및 `iv_records.py` Import 정리
   - **Frontend**: `any` 타입 제로화(`VitalDataResponse` 도입) 및 Lint Warning(의존성 배열) 해결
   - **Build**: `compileall` 및 `npm run lint` 통과 확인 (Quality Gate 준수)

5. **Code Review Refactoring (Phase 1-4)**:
   - **WebSocket Hotfix**: `station_connections` 버그 수정 및 `active_connections` 로직 통일
   - **Contract Stabilization**: `DashboardResponse` DTO(Pydantic) 정의 및 Frontend와 `patient_name_masked` 필드 일치
   - **Data Correctness**: 입원 중복 제거 로직 개선 (`id` -> `check_in_at` 기준)
   - **Performance**: 입원 목록 조회 시 N+1 쿼리 제거 (Batch Query 도입)
   - **Operational Hardening**: `FAIL_FAST` (Env Check), `CORS Tightening` (`ALLOWED_ORIGINS`), `Healthcheck` (`/health`) 도입

- [x] **Produiction Hardening (Phases A-E)**: WebSocket broadcast, Batch queries, Empty Bed admission, Transfer functionality.
- [x] **Expanded Meal Domain (Phase F)**: Pediatric/Guardian meal types and station grid summary.
- [x] **Guardian Dashboard Refinement (Phases S-Y)**:
    - Early morning meal sync fix (00:00-05:59).
    - Exam registration moved to sub-modal.
    - Balanced 2-column grid for meal options.
    - Modernized 1-line patient header with responsive design & indentation.
    - Standardized card headers with w-9 h-9 icon backgrounds across all components.
    - PC layout optimization (Left: Medical/IV, Right: Admin/Notices).

- [x] **Dashboard Sync & Resilience (2026-02-15)**:
    - **Optimistic UI**: `PatientDetailModal`에서 체온 입력 시 즉시 반영 (`addOptimisticVital`).
    - **Backend Meals Sorting**: 식단 조회 시 날짜/시간(저녁>점심>아침) 순 서버 정렬 보장.
    - **WebSocket Resilience**: `useWebSocket` 훅 도입으로 지수 백오프(Exponential Backoff) 및 자동 재연결 표준화.
    - **Developer Standards**: `docs/DEVELOPMENT_STANDARDS.md` 생성하여 핵심 로직(중복 제거, ID 체크 등) 문서화.
    - **Sync Refinements (Phase A-D)**:
        - `useStation`: `NEW_MEAL`/`NEW_VITAL` 수신 시 즉시 상태 패치 (체감 속도 향상).
        - `PatientDetailModal`: 중복 `useEffect` 제거로 불필요한 네트워크 요청 방지.
        - `useVitals`: `admissionIdRef` 도입으로 소켓 재연결 최적화.
- [x] **Modular Refactoring for AI Context Efficiency (2026-02-17)**:
    - **Frontend**: `dashboard`, `station` 페이지의 비즈니스 로직을 `useDashboardStats`, `useStationActions` 훅으로 추출 및 컴포넌트 아토믹 분할.
    - **Backend**: `admissions`, `meals`, `iv_records`, `dev` 라우터의 비즈니스 로직을 `services/` 레이어로 완전 이관 (Router Slimming).
    - **Result**: 모든 파일이 500라인(20KB) 이하를 유지하며 AI 컨텍스트 효율성 극대화.
    - **Stability**: 백엔드 단위 테스트 8건 전원 통과 (`pytest`) 및 프론트엔드 Lint 준수.
- [x] **Document Request Real-time Sync & Optimization (2026-02-18)**:
    - **Real-time Sync**: `DOC_REQUEST_UPDATED` 및 `NEW_DOC_REQUEST` 메시지를 STATION뿐만 아니라 관련 환자(`token`) 채널에도 브로드캐스트하여 서브모달과 보호자 대시보드가 즉시 갱신되도록 개선.
    - **Data Aggregation**: `useDashboardStats.ts`에서 모든 미완료/완료(`not CANCELED`) 서류 신청 내역을 합쳐서(`flatMap`) 보여주도록 수정하여 정보 일치성 확보.
    - **Bug Fixes**: 
        - `DocumentRequest` Pydantic 모델에 `created_at` 필드 추가로 "Invalid Date" 오류 해결.
        - Supabase SDK의 `update().eq().select()` 제약 사항을 반영하여 업데이트와 조회를 분리 처리.
        - 환자 서브모달 내 검사 일정 타이틀을 "예정된 검사 일정"으로 변경하여 용어 통일.
    - **Stability**: `useVitals.ts`에서 메시지 수신 시 `debouncedRefetch`를 호출하여 서버 데이터와의 정합성 극대화.

