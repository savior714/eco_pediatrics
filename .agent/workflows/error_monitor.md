---
description: 에러 모니터 실행 및 Gemini 컨텍스트 패키지 생성 워크플로우
---

# eco_pediatrics Error Monitor 워크플로우

> 이 워크플로우는 **Pure-Polling 방식**으로 백엔드·프론트엔드 등 모든 서비스 로그를 동시에 감시하고,
> 에러 감지 시 Gemini 에 붙여넣을 수 있는 컨텍스트 패키지(`prompt_for_gemini.md`)를 자동 생성합니다.

---

## 사전 조건

- `backend/.venv` 가 존재할 것 (특별한 외부 라이브러리 불필요 — 표준 라이브러리만 사용)
- `start_frontend.bat` 이 `frontend/logs/frontend.log` 에 stdout을 기록할 것

---

## 권장 실행 방법: `run_dev.bat`

`run_dev.bat` 을 실행하면 다음이 **자동**으로 완료됩니다.

```powershell
# 프로젝트 루트에서 실행
.\run_dev.bat
```

**자동 처리 내용**:
1. Backend / Frontend / Error Monitor 터미널 패널 동시 실행
2. `--clear` 플래그로 이전 세션 로그 초기화 후 새 세션 시작
3. 모든 `WATCH_TARGETS` 로그 파일 감시 즉시 개시

---

## 수동 실행 방법

### 터미널 1 — 에러 모니터

```powershell
# 새 세션 (로그 초기화 포함)
backend\.venv\Scripts\python error_monitor.py --clear

# 기존 로그 유지하며 재시작
backend\.venv\Scripts\python error_monitor.py
```

### 터미널 2 — 백엔드

```powershell
# loguru 가 backend/logs/app.log 에 자동 기록
.\start_backend.bat
```

### 터미널 3 — 프론트엔드

```powershell
# stdout 이 frontend/logs/frontend.log 에 동시 기록됨 (Tee-Object 방식)
.\start_frontend.bat
```

---

## 감시 대상 (WATCH_TARGETS)

| 레이블 | 로그 파일 | 수집 방식 |
|---|---|---|
| `Backend` | `backend/logs/app.log` | loguru 파일 직접 출력 |
| `Frontend` | `frontend/logs/frontend.log` | PowerShell Tee-Object 리다이렉트 |

> **새 서비스 추가 시**: `error_monitor.py` 상단의 `WATCH_TARGETS` 딕셔너리에 항목 추가.  
> 예: `"Worker": (PROJECT_ROOT / "logs" / "worker.log").resolve()`

---

## Source Code Context (SOURCE_FILES)

Gemini 리포트에 자동 첨부되는 소스 파일 목록입니다.

| 파일 | 언어 | 역할 |
|---|---|---|
| `backend/main.py` | Python | FastAPI 엔트리포인트 |
| `backend/routers/station.py` | Python | 스테이션 대시보드 라우터 |
| `backend/routers/admissions.py` | Python | 입원 관리 라우터 |
| `backend/routers/exams.py` | Python | 검사 관리 라우터 |
| `backend/websocket_manager.py` | Python | WebSocket 실시간 알림 |
| `backend/utils.py` | Python | 공통 유틸리티 |
| `backend/models.py` | Python | DB 모델 |
| `backend/schemas.py` | Python | Pydantic 스키마 |
| `backend/constants/mappings.py` | Python | 공통 매핑 상수 |
| `frontend/src/lib/api.ts` | TypeScript | API 클라이언트 |
| `frontend/src/hooks/useStation.ts` | TypeScript | 스테이션 핵심 훅 |
| `frontend/src/hooks/useWebSocket.ts` | TypeScript | WebSocket 훅 |
| `frontend/src/hooks/useDashboardStats.ts` | TypeScript | 대시보드 통계 훅 |
| `frontend/src/types/domain.ts` | TypeScript | 도메인 타입 정의 |

> **파일 추가 시**: `error_monitor.py` 의 `SOURCE_FILES` 리스트에 `Path(...)` 형태로 추가.  
> 확장자에 따라 코드 블록 언어(python/typescript/rust/sql 등)가 자동 분기됩니다.

---

## 에러 감지 패턴

| 기술 스택 | 감지 키워드 |
|---|---|
| Python / Backend | `ERROR`, `CRITICAL`, `Traceback`, `Exception`, 각종 `Error` 타입 |
| TypeScript / Next.js | `FAILED`, `Unhandled`, `Uncaught`, `SyntaxError`, `ReferenceError` |
| Tauri / Rust / Chromium | `panicked`, `RUST_BACKTRACE`, `Error =` |
| Build / 시스템 | `error[`, `TS\d{4}`, `ENOENT`, `ECONNREFUSED` |

---

## 결과물 활용

1. 에러 감지 시 `prompt_for_gemini.md` 자동 업데이트
2. 파일 전체(`Ctrl+A` → `Ctrl+C`)를 Gemini / NotebookLM 에 붙여넣기
3. Gemini 가 반환하는 `[Antigravity Task]` 블록만 복사
4. Antigravity 대화창에 붙여넣어 즉시 실행

---

## 유틸리티 명령어

```powershell
# 로그·리포트 전체 초기화 후 종료 (다음 실행에 영향 없음)
backend\.venv\Scripts\python error_monitor.py --cleanup

# 새 세션 시작 (--clear = 시작 시 로그 초기화)
backend\.venv\Scripts\python error_monitor.py --clear

# 단순 재시작 (로그 유지)
backend\.venv\Scripts\python error_monitor.py
```
