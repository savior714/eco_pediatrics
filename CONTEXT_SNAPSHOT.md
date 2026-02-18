# Context Snapshot

- **Audit Log & Meal Request RPC 도입**: RLS 제약을 우회하고 보안을 강화하기 위해 `SECURITY DEFINER` 기반의 RPC 함수(`log_audit_activity`, `upsert_meal_requests_admin`) 도입 및 연동 완료
- **React Key 경고 원천 차단**: 상세 모달 및 사이드바의 모든 리스트 렌더링에 고유 접두사(`exam-`, `notif-`)와 인덱스를 결합한 Key 로직 적용
- **대시보드 데이터 노출 로직 보정**: 상위 5개로 제한되던 식단 노출 로직을 해제하고, KST 타임존 보정을 통해 오늘/내일 데이터 누락 문제 해결
- **PostgREST 20.5 (PGRST205) 호환성 확보**: 스키마 구조 최적화 및 `view_station_dashboard` 도입을 통한 500 에러 해결
- **백엔드 예외 처리 강화**: 전역 예외 핸들러 및 환경별 상세 에러 메시지(local/dev) 도입
- **프론트엔드 모듈화**: `StationActions`, `DashboardStats` 훅 추출로 컴포넌트 복잡도 획기적 개선
- **감사 로그 고도화**: 환자 전실/퇴원/생성 시 실제 클라이언트 IP 주소 추적 기능 도입
- 보호자 대시보드 및 간호 스테이션 핵심 기능 안정화 단계 진입

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
86: 
87: - [x] **Dashboard Sync & Resilience (2026-02-15)**:
88:     - **Optimistic UI**: `PatientDetailModal`에서 체온 입력 시 즉시 반영 (`addOptimisticVital`).
89:     - **Backend Meals Sorting**: 식단 조회 시 날짜/시간(저녁>점심>아침) 순 서버 정렬 보장.
90:     - **WebSocket Resilience**: `useWebSocket` 훅 도입으로 지수 백오프(Exponential Backoff) 및 자동 재연결 표준화.
91:     - **Developer Standards**: `docs/DEVELOPMENT_STANDARDS.md` 생성하여 핵심 로직(중복 제거, ID 체크 등) 문서화.
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
