# Eco-Pediatrics Guardian Dashboard

소아과 병동 입원 보호자를 위한 실시간 모니터링 및 요청 서비스 플랫폼입니다.

## 주요 기능
- **실시간 활력징후 모니터링**: 환아의 체온을 실시간 그래프로 확인 (5일치 스크롤 뷰 지원)
- **식단 신청 기능**: 일반식, 죽, 금식(NPO) 등 식단 타입을 간편하게 요청
- **필요 서류 신청**: 영수증, 세부내역서, 진단서 등 여러 서류를 한 번에 신청
- **수액 상태 모니터링**: 수액 주입 속도(cc/hr) 및 간호사 확인 상태 실시간 공유
- **병동 공지사항**: 병동의 주요 공지사항을 대시보드에서 바로 확인

## 기술 스택
- **Frontend**: Next.js (App Router), Tailwind CSS v4, Lucide React, Recharts
- **Backend**: FastAPI, Python 3.x, WebSockets
- **Database**: Supabase (PostgreSQL)

## 시작하기
1. `backend/.env` 및 `frontend/.env.local` 파일에 Supabase 설정 추가
2. `easy_start.bat` 실행 (백엔드, 프론트엔드 동시 실행)
3. `python backend/seed_data.py`로 초기 테스트 데이터 생성
4. 생성된 URL로 보호자 대시보드 접속

## 문서
- [Context Snapshot](./CONTEXT_SNAPSHOT.md): 프로젝트 현재 상태 및 주요 설계 결정
- [Next Steps](./NEXT_STEPS.md): 향후 구현 예정인 기능 및 작업 목록
- [Troubleshooting](./TROUBLESHOOTING.md): 발생했던 문제 및 해결 방법
