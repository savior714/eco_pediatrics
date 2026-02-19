---
description: 에러 모니터 실행 및 Gemini 컨텍스트 패키지 생성 워크플로우
---

# eco_pediatrics Error Monitor 워크플로우

## 사전 조건

프로젝트 루트 기준 `backend/.venv` 가 활성화된 상태여야 합니다.

```powershell
# watchdog 미설치 시 1회만 실행
backend\.venv\Scripts\pip install watchdog
```

---

## 실행 절차

### 터미널 1 — 에러 모니터 시작

```powershell
# 프로젝트 루트에서 실행
python error_monitor.py
```

### 터미널 2 — 백엔드 실행 (에러를 로그로 리다이렉트)

```powershell
# 백엔드를 일반 실행 (loguru 가 backend/logs/app.log 에 자동 기록)
backend\.venv\Scripts\python -m uvicorn backend.main:app --reload 2>&1
```

> **참고**: loguru 는 stderr 리다이렉트 없이도 `backend/logs/app.log` 에 자동 기록합니다.

---

## 결과물 활용

1. ERROR/CRITICAL 발생 시 `prompt_for_gemini.md` 자동 생성 + 알림음
2. `prompt_for_gemini.md` 전체 내용(Ctrl+A → Ctrl+C)을 Gemini 에 붙여넣기
3. Gemini 가 반환하는 `[Antigravity Task]` 블록만 복사
4. Antigravity 대화창에 붙여넣어 즉시 실행

---

## 감시 대상 파일 목록 (error_monitor.py 설정)

| 파일 | 역할 |
|---|---|
| `backend/main.py` | FastAPI 엔트리포인트 |
| `backend/routers/station.py` | 스테이션 대시보드 라우터 |
| `backend/routers/admissions.py` | 입원 관리 라우터 |
| `backend/routers/exams.py` | 검사 관리 라우터 |
| `backend/websocket_manager.py` | WebSocket 실시간 알림 |
| `backend/utils.py` | 공통 유틸리티 |
| `backend/models.py` | DB 모델 |
| `backend/schemas.py` | Pydantic 스키마 |

추가 파일이 필요하면 `error_monitor.py` 의 `SOURCE_FILES` 리스트에 추가하세요.
