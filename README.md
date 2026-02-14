 - **Backend**: Layered Architecture
   - `routers/`: 도메인별 엔드포인트 분리 (Admissions, Station, IV, Vitals, Exams)
   - `services/`: 비즈니스 로직 분리 (Dashboard Data Fetching)
   - `utils.py`, `dependencies.py`: 공통 유틸리티 및 의존성 분리
   - Global Exception Handling & Structured Logging (`loguru`)
 - **Frontend**:
   - `hooks/useStation.ts`: 데이터 페칭 및 WebSocket 로직 분리
   - `lib/api.ts`: 중앙화된 API 클라이언트 (Axios 대체)
   - `types/domain.ts`: 도메인 타입 정의 통합
 
 ## 시작하기
 1. `backend/.env` 생성 후 Supabase URL·KEY 설정 (참고: `backend/.env.example`)
 2. **백엔드**: `start_backend.bat` 실행 → http://localhost:8000
 3. **프론트**: `start_frontend.bat` 실행 → http://localhost:3000 (별도 창에서)
 4. **테스트 데이터(필요할 때만)**  
    - 보호자 대시보드용 더미 1건: `seed_data.bat`  
    - 스테이션 30병상 연동용: 백엔드 실행 후 `POST http://localhost:8000/api/v1/seed/station-admissions` 호출 후 스테이션 새로고침  
    자세한 내용은 [TROUBLESHOOTING.md §7](./TROUBLESHOOTING.md) 참고.
 
 한 번에 실행하려면 `easy_start.bat`(시드 포함)을 쓸 수 있으나, 충돌 시 위처럼 백엔드/프론트를 각각 띄우고 필요할 때만 시드하세요.
 
 ## 문서
 - [Context Snapshot](./CONTEXT_SNAPSHOT.md): 프로젝트 현재 상태 및 주요 설계 결정
 - [Next Steps](./NEXT_STEPS.md): 향후 구현 예정인 기능 및 작업 목록
 - [Troubleshooting](./TROUBLESHOOTING.md): 발생했던 문제 및 해결 방법
+
+---
+
+## 개발 내역 상세 정리 (최신 푸시 반영 / 중복 제거)
+
+아래는 최근까지 누적된 개발 내용을 **기능 단위로 통합**해 정리한 내용입니다. (UI 스타일 미세 조정 커밋들은 묶어서 요약)
+
+### 1) 코어 아키텍처/안정화
+- 백엔드를 `routers/ + services` 구조로 분리하여 책임을 명확히 분할.
+  - Admissions / Station / IV / Vitals / Exams / Dev 라우터 분리
+  - Dashboard 데이터 집계 로직을 `services/dashboard.py`로 분리
+- FastAPI 전역 예외 처리, 로깅(loguru), lifespan 기반 AsyncClient 초기화/정리 도입.
+- 프론트엔드는 `hooks/useStation.ts`, `lib/api.ts`, `types/domain.ts`를 중심으로 데이터 흐름/타입 관리를 표준화.
+
+### 2) 입원/병상 운영 로직 고도화
+- 스테이션이 고정 더미가 아닌 실제 `GET /api/v1/admissions` 데이터 기반으로 병상 렌더링.
+- 중복 입원 건 정합성 개선(최신 입원 우선) 및 병상 반영 안정화.
+- 입원 생성 직후 스테이션 반영 체감 문제를 줄이기 위한 로딩/갱신 흐름 정리.
+- 전실(Transfer), 전체 퇴원(dev) 등 병동 운영 기능 연결 강화.
+
+### 3) Vital(체온) 도메인 개선
+- 최근 바이탈 기준 필드(`latest_temp`, `last_vital_at`)를 admissions 응답에 반영.
+- 최근 6시간 발열 여부(`had_fever_in_6h`)를 산출해 스테이션 카드 강조에 활용.
+- 스테이션 상세 모달에서 체온 입력 시 카드 상태/표시값 동기화 개선.
+- 체온·수액 값은 null-safe 렌더링(값 없을 때 `-`)으로 UI 오해를 방지.
+
+### 4) WebSocket 실시간 동기화 개선
+- STATION 브로드캐스트 경로를 `active_connections[token]` 단일 구조로 정리.
+- NEW_IV / NEW_VITAL / NEW_DOC_REQUEST / NEW_MEAL_REQUEST 이벤트 흐름 정리.
+- 스테이션에서 `STATION_UPDATE` 성격 식단 변경은 알림 노이즈를 줄이도록 필터링.
+
+### 5) 식사 도메인 확장 (실무형 모델)
+- `meal_requests`에 환아/보호자/비고 필드를 확장하여 병동 실무 표현력 강화.
+  - `pediatric_meal_type`, `guardian_meal_type`, `room_note`
+- 식단 관리용 `meals` 라우터(`/api/v1/meals/*`) 정식 연결.
+- 스테이션 식단 화면을 엑셀형 매트릭스(아침/점심/저녁 × 환아/보호자)로 고도화.
+- 식사 날짜/시간 기반 처리 지원:
+  - 마이그레이션으로 `meal_date`, `meal_time` 추가
+  - `(admission_id, meal_date, meal_time)` 유니크 인덱스 기반 upsert 지원
+- 보호자 대시보드에서 `STATION_UPDATE` 타입 식사 라벨 표시 보정.
+
+### 6) 검사/서류/수액 기능 강화
+- 검사 일정 등록/수정/삭제 및 보호자 대시보드 노출 연동 강화.
+- 서류 신청(다중 선택) 흐름 안정화 및 알림 표현 개선.
+- IV 업로드/주입속도(`cc/hr`) 표시 일관성 강화, 카드 컴포넌트 시각적 통일.
+
+### 7) Guardian Dashboard UX 고도화 (모바일 + PC)
+- 보호자 대시보드의 레이아웃을 모바일 우선으로 정교화하고 PC 모드 가독성 개선.
+- 헤더/카드/아이콘 규격 통일(w-9 h-9 패턴 등), 타이포/여백 일관화.
+- 식단 선택 UI 균형화(2열), 공지/행정 섹션 배치 최적화.
+- 새벽 시간대 식사 요약 동기화 버그(당일 식단 표시) 수정.
+
+### 8) 운영/품질 개선
+- Next.js 보안 패치 반영(14.2.35) 및 실행 스크립트 보완.
+- `.env.example`, health check(`/health`), CORS/환경설정 점검 로직 보완.
+- 타입/린트 경고 감소, `any` 축소, 모달/상세 컴포넌트 의존성 정리.
+
+### 9) 현재 제품 관점 요약
+- **스테이션**: 입원/전실/활력징후/수액/식단/검사/서류를 한 화면에서 운영하는 실시간 관제 흐름 완성도 상승.
+- **보호자 대시보드**: QR 접속 기반으로 체온 추이·수액·식단·검사·서류를 실시간 확인/요청 가능.
+- **백엔드/데이터**: Async + 라우터 분리 + 도메인 확장으로, 기능 추가 시 변경 지점이 명확한 구조로 정리됨.
+
+### 10) 남은 개선 포인트 (우선순위)
+1. Meal WS 이벤트 범위 최적화(전체 broadcast 최소화)
+2. 식사 스키마 마이그레이션 멱등성/제약 강화(`IF NOT EXISTS`, `CHECK`)
+3. `meal_time` Enum 강제 등 API contract를 타입/DB 양쪽에서 고정
