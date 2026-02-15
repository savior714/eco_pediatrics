# Context Snapshot

## 현재 상태 (2026-02-15)

- 보호자 대시보드(Guardian Dashboard) 핵심 기능 구현 완료, **모바일(QR 접속) 우선** 적용
- 간호 스테이션(Nurse Station) MVP 구현 완료 (환자 패널 클릭 → 상세 모달, IV·체온 차트·요청·**예정된 검사** 포함)
- 백엔드 API 및 실시간 웹소켓 연동 완료
- DB 스키마: 식단, 서류, 수액, **검사 일정(exam_schedules)**, 감사 로그

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
- [x] **실시간 동기화 하드닝 (Phase ZC-ZF)**: 스테이션–보호자 간 100% 실시간 연동 (검사 일정, 전실, 퇴원, 수액 속도). WebSocket Partial Update 도입으로 지연 시간 최소화
- [x] **체온 차트 정렬 최적화 (Phase ZE)**: 가로축(X-axis)을 자정 기준으로 고정하여 날짜 칸막이와 데이터 위치가 어긋나던 버그 수정

## Refactoring (2026-02-14)

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
        - `Backend`: 식단 정렬 로직 강화 (Date > TimeRank > ID).
