# Eco-Pediatrics Guardian Dashboard

소아과 병동 입원 보호자를 위한 실시간 모니터링 및 요청 서비스 플랫폼입니다.

## 주요 기능
- **실시간 활력징후 모니터링**: 환아의 체온을 실시간 그래프로 확인 (5일치 스크롤, 38° 기준 색상 구분)
- **식사 신청 및 관리**: 현재 신청된 식단(환아/보호자) 확인 및 슬롯별(조식/중식/석식) 유형 변경
- **필요 서류 신청**: 영수증, 세부내역서, 진단서 등 여러 서류를 한 번에 신청
- **수액 상태 모니터링**: 수액 주입 속도(cc/hr) 및 간호사 확인 상태 실시간 공유
- **앞으로의 검사 일정**: 스테이션에서 등록한 예정 검사 일정 표시 (API·DB 연동)
- **병동 공지사항**: 병동의 주요 공지사항을 대시보드에서 바로 확인

보호자 대시보드는 **모바일(스마트폰 QR 접속)** 에 최적화되어 있으며, PC 뷰도 지원합니다.

## 기술 스택
- **Frontend**: Next.js (App Router), Tailwind CSS v4, Lucide React, Recharts
- **Backend**: FastAPI, Python 3.x, WebSockets, Loguru
- **Database**: Supabase (PostgreSQL)

## 아키텍처 (2026-02-14 리팩토링)
- **Backend**: Layered Architecture
  - `routers/`: 도메인별 엔드포인트 분리 (Admissions, Station, IV, Vitals, Exams, Meals)
  - `services/`: 비즈니스 로직 분리 (Dashboard Data Fetching 등)
  - `utils.py`, `dependencies.py`: 공용 유틸리티 및 의존성 주입 분리
  - Global Exception Handling & Structured Logging 적용
- **Frontend**:
  - `hooks/useStation.ts`: 스테이션 상태 및 WebSocket 동기화 로직 분리
  - `lib/api.ts`: 중앙화된 API 클라이언트 추상화
  - `types/domain.ts`: 도메인 타입 정의 통합 관리

## 시작하기
1. `backend/.env` 생성 후 Supabase URL/KEY 설정 (참고: `backend/.env.example`)
2. **백엔드**: `start_backend.bat` 실행 → http://localhost:8000
3. **프론트**: `start_frontend.bat` 실행 → http://localhost:3000

## 운영 설정 (Deployment Configuration)

안전한 운영을 위해 아래 환경 변수 설정을 권장합니다.

| 환경 변수 | 설명 | 권장 값 (운영/로컬) |
| :--- | :--- | :--- |
| `ENV` | 애플리케이션 환경 구분 | `production` / `local` |
| `ENABLE_DEV_ROUTES` | 개발용 API (`/api/v1/dev`) 활성화 여부 | `false` / `true` |
| `STATION_WS_TOKEN` | 스테이션 대시보드 WebSocket 인증 토큰 | 임의의 보안 문자열 / `STATION` |
| `NEXT_PUBLIC_STATION_WS_TOKEN` | (프론트) 스테이션 연결용 토큰 (백엔드와 일치 필수) | `STATION_WS_TOKEN`과 동일 |

4. **테스트 데이터(Seed)**  
   - 전체 통합 테스트 데이터: `POST http://localhost:8000/api/v1/seed/full-test-data` (입원+바이탈+일정 일괄 생성)
   - 자세한 내용은 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) 참고.

---

## 개발 내역 상세 정리 (최신 업데이트 반영)

아래는 프로젝트 진행 과정에서 누적된 주요 개발 내용을 기능 단위로 통합 정리한 내용입니다.

### 1) 코어 아키텍처 및 안정화
- 백엔드를 `routers/ + services` 구조로 분리하여 코드 가독성과 유지보수성을 확보했습니다.
- FastAPI 전역 예외 처리와 `loguru` 기반의 구조화된 로깅을 도입했습니다.
- 프론트엔드와 백엔드 간의 데이터 규격(DTO)을 Pydantic으로 표준화하여 타입 안정성을 강화했습니다.

### 2) 입원 및 병상 운영 시스템
- 실제 데이터 기반의 실시간 병상 렌더링 시스템을 구축했습니다.
- 병상 전실(Transfer), 퇴원 처리, 신규 입원 등의 운영 인터페이스를 완성했습니다.

### 3) 실시간 바이탈 및 수액 모니터링
- Recharts 기반의 체온 차트에 38도 기준 그라데이션 및 약물(A/I/M) 아이콘 표시 기능을 구현했습니다.
- 수액 주입 속도를 임상 표준인 `cc/hr` 단위로 통일하고 실시간 사진 업로드 확인 기능을 추가했습니다.

### 4) 식사 및 영양 지원 (실무형 모델)
- 환아뿐만 아니라 보호자 식사까지 관리 가능한 확장된 모델(`meal_requests`)을 도입했습니다.
- 스테이션용 식단 매트릭스 UI와 보호자용 슬롯별 식단 변경 기능을 연동했습니다.

### 5) 검사 일정 및 행정 지원
- 예정된 검사 일정을 오전/오후로 나누어 등록하고 보호자에게 실시간 공유하는 기능을 구현했습니다.
- 다중 서류 신청 및 실시간 요청 알림 시스템을 구축했습니다.

### 6) UI/UX 고도화 및 디자인 표준화
- **Standardized Headers**: 모든 대시보드 박스에 일관된 아이콘 패턴(w-9 h-9 백그라운드)을 적용했습니다.
- **Modernized Layout**: 환자 헤더를 1행으로 슬림화하고, PC 뷰 레이아웃을 최적화(의료 정보 좌측, 행정 정보 우측)했습니다.
- **Mobile First**: QR 접속 환경을 고려한 터치 영역 최적화 및 Safe Area 대응을 완료했습니다.

## 관련 문서
- [Context Snapshot](./CONTEXT_SNAPSHOT.md): 프로젝트 현재 상태 및 주요 설계 결정
- [Next Steps](./NEXT_STEPS.md): 향후 구현 예정인 기능 및 작업 목록
- [Troubleshooting](./TROUBLESHOOTING.md): 발생했던 문제 및 해결 방법
