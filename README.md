# Eco-Pediatrics Guardian Dashboard

소아과 병동 입원 보호자를 위한 실시간 모니터링 및 요청 서비스 플랫폼입니다.

## 주요 기능
- **실시간 활력징후 모니터링**: 환아의 체온을 실시간 그래프로 확인 (5일치 스크롤, 38° 기준 색상 구분)
- **식단**: 현재 신청된 식단 표시 + 변경 버튼으로 일반식/죽/금식 신청
- **필요 서류 신청**: 영수증, 세부내역서, 진단서 등 여러 서류를 한 번에 신청
- **수액 상태 모니터링**: 수액 주입 속도(cc/hr) 및 간호사 확인 상태 실시간 공유
- **앞으로의 검사 일정**: 스테이션에서 등록한 예정 검사 일정 표시 (API·DB 연동)
- **병동 공지사항**: 병동의 주요 공지사항을 대시보드에서 바로 확인

보호자 대시보드는 **모바일(스마트폰 QR 접속)** 에 맞춰 설계되어 있습니다.

## 기술 스택
- **Frontend**: Next.js (App Router), Tailwind CSS v4, Lucide React, Recharts
- **Backend**: FastAPI, Python 3.x, WebSockets
- **Database**: Supabase (PostgreSQL)

## 아키텍처 (Refactoring 2026-02-14)
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
