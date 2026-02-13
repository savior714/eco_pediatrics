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

## 시작하기
1. `backend/.env` 생성 후 Supabase URL·KEY 설정 (참고: `backend/.env.example`)
2. `easy_start.bat` 실행 (venv·의존성 설치 후 백엔드·프론트 동시 실행)
3. 시드 단계에서 출력되는 대시보드 URL로 보호자 페이지 접속 (QR 스캔 가정)
4. **검사 일정 연동 테스트**: 개발 시 `POST http://localhost:8000/api/v1/seed/station-admissions` 한 번 호출 후 스테이션 새로고침 → 환자 모달에서 검사 일정 추가 가능. 자세한 내용은 [TROUBLESHOOTING.md §7](./TROUBLESHOOTING.md) 참고.

## 문서
- [Context Snapshot](./CONTEXT_SNAPSHOT.md): 프로젝트 현재 상태 및 주요 설계 결정
- [Next Steps](./NEXT_STEPS.md): 향후 구현 예정인 기능 및 작업 목록
- [Troubleshooting](./TROUBLESHOOTING.md): 발생했던 문제 및 해결 방법
