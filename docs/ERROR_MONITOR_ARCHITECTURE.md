# Agentic IDE ↔ LLM 순환 디버깅 자동화 시스템
## "Error Monitor" 아키텍처 및 구현 가이드 (v3 — Multi-Stack Edition)

> **이 문서의 목적**: Antigravity(Agentic IDE)와 Gemini(LLM) 사이의 순환 디버깅 구조를 API 없이 파일 기반으로 자동화한 시스템을 설명합니다.  
> 이 문서를 읽고 따르면 **어떤 기술 스택 조합에서도 즉시 동일한 에러 모니터를 구축**할 수 있습니다.

---

## 1. 배경: 왜 이 시스템이 필요했는가?

```
에러 발생 → 로그 확인 → 코드 복사 → LLM에 붙여넣기 → 해결책 얻기 → 코드 수정
                ↑____________________________________________↓
                           (이 사이의 수작업을 자동화한다)
```

`Antigravity` 같은 Agentic IDE가 코드를 자율적으로 수정해도, 에러가 났을 때 에러 내용을 다시 에이전트에게 전달하는 경로가 수작업으로 남아 있습니다. 이 시스템은 그 경로를 파일 기반으로 자동화합니다.

---

## 2. 선택지 분석: 왜 파일 기반인가?

| 방법 | 장점 | 단점 |
|---|---|---|
| **LLM API 직접 호출** | 완전 자동화 | API 비용, API 키 관리 필요 |
| **IDE 플러그인** | IDE 통합 | IDE 내부 구조에 종속, 불안정 |
| **Webhook 서버** | 확장 용이 | 별도 인프라 필요 |
| **📁 파일 기반 (채택)** | 무료·범용·단순 | 개발자가 LLM에 수동 붙여넣기 필요 |

> **결론**: API 키 없이 실현 가능한 최선의 방법은 **파일 시스템을 공유 메모리로 활용**하는 것입니다.

---

## 3. 시스템 아키텍처: 전체 순환 구조

```
┌──────────────────────────────────────────────────────────┐
│                    개발 환경 (로컬 머신)                    │
│                                                          │
│  [서비스 A]  [서비스 B]  [서비스 C] ... (각 기술 스택)     │
│  FastAPI     Next.js+Tauri  Celery Worker  ...            │
│     │             │              │                        │
│     │ ② 각 서비스의 에러를 로그 파일로 수집                 │
│     ▼             ▼              ▼                        │
│  [app.log] [frontend.log] [worker.log]  ...               │
│                                                          │
│              ③ Pure-Polling 감시                          │
│         ┌──────────────────────────┐                     │
│         │      error_monitor.py    │                     │
│         │  WATCH_TARGETS = {       │                     │
│         │    "Backend": app.log,   │                     │
│         │    "Frontend": ...,      │                     │
│         │    "Worker": ...,  ...   │                     │
│         │  }                       │                     │
│         └────────────┬─────────────┘                     │
│                      │ ④ 리포트 생성                       │
│                      ▼                                   │
│       docs/prompts/prompt_for_gemini.md                  │
│     (에러 히스토리 + 전체 소스 컨텍스트 통합 패키지)          │
│                      │ ⑤ 개발자가 LLM에 붙여넣기           │
│                      ▼                                   │
│            NotebookLM / Gemini                           │
│     → [Antigravity Task] 형식으로 수정 지시 출력           │
│                      │ ⑥ Antigravity가 코드 수정 → ①      │
└──────────────────────────────────────────────────────────┘
```

---

## 4. 기술 스택별 로그 수집 전략

> **이 섹션이 핵심입니다.** 에러 모니터가 인식하려면 각 서비스의 출력이 **파일**로 수집되어야 합니다.  
> 아래 표를 참고해 프로젝트의 모든 기술 스택에 대한 수집 방법을 적용하세요.

### 4-1. 수집 방법 분류

모든 서비스의 로그 수집은 두 가지 방법 중 하나입니다.

| 방법 | 적용 상황 | 특징 |
|---|---|---|
| **A. 파일 직접 출력** | 서비스가 자체적으로 로그 파일 기록 | 별도 설정 필요 없음 |
| **B. stdout 리다이렉트** | 서비스가 터미널에만 출력 | Tee 방식으로 파일 동시 기록 |

### 4-2. 기술 스택별 적용 방법 참조표

#### 🐍 Python 계열 (FastAPI, Django, Flask, Celery, pytest 등)

| 서비스 | 로그 수집 방법 | 예시 |
|---|---|---|
| FastAPI + loguru | **방법 A** (직접 파일 출력) | `logger.add("logs/app.log")` |
| Django | **방법 A** (`LOGGING` 설정) | `handlers.file` 설정 |
| Celery Worker | **방법 B** (stdout 리다이렉트) | `celery worker ... 2>&1 >> logs/worker.log` |
| pytest | **방법 B** | `pytest ... 2>&1 \| tee logs/test.log` |

```python
# loguru 설정 예시 (FastAPI)
from loguru import logger
logger.add("logs/app.log", rotation="10 MB", retention="7 days")
```

```batch
:: Celery (Windows)
powershell -Command "celery -A app worker 2>&1 | Tee-Object -FilePath 'logs\worker.log' -Append"
```

#### ⚛️ JavaScript / TypeScript 계열 (Next.js, React, Vite, Node.js 등)

이 계열은 기본적으로 터미널로만 출력하므로 **방법 B (stdout 리다이렉트)** 가 필요합니다.

| 서비스 | Windows | Mac/Linux |
|---|---|---|
| Next.js dev 서버 | `powershell -Command "npm run dev 2>&1 \| Tee-Object -FilePath 'logs\frontend.log' -Append"` | `npm run dev 2>&1 \| tee -a logs/frontend.log` |
| Vite dev 서버 | `powershell -Command "npm run dev 2>&1 \| Tee-Object ..."` | `npm run dev 2>&1 \| tee -a logs/vite.log` |
| Node.js 서버 | `powershell -Command "node server.js 2>&1 \| Tee-Object ..."` | `node server.js 2>&1 \| tee -a logs/node.log` |

#### 🦀 Rust / Tauri 계열

Tauri 데스크탑 앱은 Chromium WebView + Rust 프로세스가 함께 실행됩니다.

```batch
:: start_frontend.bat - Tauri dev (Windows)
if not exist logs mkdir logs
powershell -Command "npm run tauri dev 2>&1 | Tee-Object -FilePath '.\logs\frontend.log' -Append"
```

Rust 패닉/에러는 `panicked at`, `RUST_BACKTRACE`, `Error =` 형태로 출력됩니다. (아래 에러 패턴 참조)

#### 🗄️ 데이터베이스 / 백그라운드 서비스

| 서비스 | 방법 |
|---|---|
| PostgreSQL | `postgresql.conf`의 `log_destination = 'file'` 설정 후 로그 경로 등록 |
| Redis | `redis.conf`의 `logfile ./logs/redis.log` 설정 |
| Supabase (로컬) | Supabase CLI의 `supabase logs` 출력을 리다이렉트 |
| Docker 컨테이너 | `docker logs -f [container] >> logs/docker.log` |

#### ☁️ 기타 프로세스

| 서비스 | 방법 |
|---|---|
| OpenAPI / Swagger 서버 | stdout 리다이렉트 (방법 B) |
| Background 스크립트 | `python script.py >> logs/script.log 2>&1` |
| tRPC / gRPC 서버 | 각 언어의 파일 로깅 모듈 사용 |


### 4-3. 외부 서비스 (SaaS/Cloud Type) 감지 전략

Supabase(PostgreSQL), AWS S3, Firebase 등 **로그 파일에 직접 접근할 수 없는 클라우드 서비스**의 에러는 **연동된 백엔드/프론트엔드 로그**를 통해 간접적으로 감지합니다.

| 서비스 유형 | 감지 경로 | 감지 원리 |
|---|---|---|
| **Supabase (DB)** | `Backend` (`app.log`) | `SQLAlchemyError`, `PostgrestError` 발생 시 백엔드 로그에 트레이스백 기록됨 |
| **Supabase (Auth)** | `Frontend` (`frontend.log`) | `AuthApiError`, `401 Unauthorized` 등이 브라우저 콘솔(stdout)에 출력됨 |
| **AWS S3 / Redis**| `Backend` (`app.log`) | `Boto3Error`, `RedisConnectionError` 등으로 포착 가능 |

> **Note**: 따라서 별도의 `WATCH_TARGETS` 추가 없이도, **Backend와 Frontend 로그 감시만으로 외부 서비스 연동 에러를 대부분 커버**할 수 있습니다.

### 4-4. `WATCH_TARGETS` 등록 예시 (프로젝트별 설정)

```python
# error_monitor.py 상단 설정 — 프로젝트 기술 스택에 맞게 수정
WATCH_TARGETS: Final[dict[str, Path]] = {
    # ─── 현재 프로젝트 (eco_pediatrics) ───
    "Backend" : (BACKEND_DIR / "logs" / "app.log").resolve(),
    "Frontend": (PROJECT_ROOT / "frontend" / "logs" / "frontend.log").resolve(),

    # ─── 추가 서비스 예시 (프로젝트에 맞게 활성화) ───
    # "Worker"   : (PROJECT_ROOT / "logs" / "worker.log").resolve(),
    # "Database" : Path("C:/ProgramData/PostgreSQL/logs/postgresql.log"),
    # "Tests"    : (PROJECT_ROOT / "logs" / "pytest.log").resolve(),
}
```

---

## 5. 기술 스택별 에러 패턴 (`_ERROR_PATTERN`)

각 기술 스택은 에러를 서로 다른 형식으로 출력합니다. `_ERROR_PATTERN`에 모든 스택의 패턴을 포함해야 합니다.

```python
_ERROR_PATTERN: re.Pattern[str] = re.compile(
    r"\b("
    # ─── Python / Backend ───
    # FastAPI, Django, Flask, loguru, logging 등
    r"ERROR|CRITICAL|Traceback|Exception"
    r"|ModuleNotFoundError|AttributeError|ValueError|TypeError"
    r"|ImportError|KeyError|IndexError|OSError|RuntimeError"
    r"|"
    # ─── JavaScript / TypeScript / Node.js ───
    # Next.js, React, Vite, Node 공통
    r"FAILED|Unhandled|Uncaught|SyntaxError|ReferenceError|RangeError"
    r"|Cannot read properties|is not a function|is not defined"
    r"|"
    # ─── Tauri / Rust ───
    r"panicked|RUST_BACKTRACE|Error ="
    r"|"
    # ─── Build 도구 공통 (webpack, tsc, cargo 등) ───
    r"error\[|TS\d{4}|Build failed|Compile error|Module not found"
    r"|"
    # ─── 시스템 / 네트워크 오류 ───
    r"ENOENT|ECONNREFUSED|EADDRINUSE|Connection refused|timed out"
    r")\b",
    re.IGNORECASE,
)
```

### 기술 스택별 대표 에러 키워드 참조표

| 기술 스택 | 대표 에러 키워드 | 예시 |
|---|---|---|
| Python (loguru) | `ERROR`, `CRITICAL`, `Traceback` | `2026-02-19 ERROR main.py:42 - ...` |
| FastAPI | `Exception`, `ValidationError` | `fastapi.exceptions.RequestValidationError` |
| TypeScript | `TS2345`, `Type error`, `error TS` | `Type 'string' is not assignable to...` |
| Next.js | `FAILED`, `Module not found`, `Build failed` | `Error: FAILED to parse ...` |
| React (런타임) | `Uncaught TypeError`, `Cannot read properties` | `Uncaught TypeError: Cannot read ...` |
| Rust / Tauri | `panicked at`, `Error =` | `thread 'main' panicked at 'index out of bounds'` |
| Chromium | `Failed to`, `Error =` | `Failed to unregister class. Error = 1411` |
| Celery | `ERROR/MainProcess`, `Exception` | `[ERROR/MainProcess] ...` |
| PostgreSQL | `ERROR`, `FATAL`, `PANIC` | `ERROR: column "x" does not exist` |
| Node.js | `ENOENT`, `ECONNREFUSED`, `Unhandled` | `Error: ENOENT: no such file ...` |
| Webpack/Vite | `Build failed`, `error in` | `ERROR in ./src/App.tsx Module not found` |

---

## 6. `SOURCE_FILES`: 기술 스택별 소스 컨텍스트 등록

에러 리포트에 자동 첨부될 소스 파일을 기술 스택에 맞게 등록합니다.  
파일 확장자에 따라 코드 블록 언어 태그가 자동으로 분기됩니다 (`.ts`/`.tsx` → `typescript`, `.py` → `python` 등).

```python
SOURCE_FILES: Final[list[Path]] = [
    # ─── Backend (Python) ───
    BACKEND_DIR / "main.py",          # 진입점
    BACKEND_DIR / "models.py",        # 데이터 모델
    BACKEND_DIR / "schemas.py",       # Pydantic 스키마
    BACKEND_DIR / "routers" / "station.py",
    BACKEND_DIR / "websocket_manager.py",

    # ─── Frontend (TypeScript / Next.js) ───
    PROJECT_ROOT / "frontend" / "src" / "lib" / "api.ts",         # API 클라이언트
    PROJECT_ROOT / "frontend" / "src" / "hooks" / "useStation.ts", # 핵심 훅
    PROJECT_ROOT / "frontend" / "src" / "hooks" / "useWebSocket.ts",
    PROJECT_ROOT / "frontend" / "src" / "types" / "domain.ts",    # 타입 정의

    # ─── 추가 스택 예시 (프로젝트에 맞게 활성화) ───
    # PROJECT_ROOT / "worker" / "tasks.py",         # Celery 태스크
    # PROJECT_ROOT / "worker" / "config.py",        # Worker 설정
]
```

**언어 태그 자동 분기 로직**:
```python
lang = {".ts": "typescript", ".tsx": "typescript", ".js": "javascript",
        ".rs": "rust", ".sql": "sql"}.get(src.suffix, "python")
```

---

## 7. 핵심 컴포넌트: `error_monitor.py` 구조 요약

### 7-1. 멀티 루프 (Pure-Polling)

```python
last_mtimes = {label: 0.0 for label in WATCH_TARGETS}

while True:
    for label, log_path in WATCH_TARGETS.items():   # 모든 스택 동시 감시
        current_mtime = log_path.stat().st_mtime
        if current_mtime != last_mtimes[label]:      # 변경 감지
            # 인코딩 자동 감지 (UTF-8 우선, 실패 시 UTF-16 LE 등 시도)
            # PowerShell Tee-Object 등 다양한 소스 대응
            log_tail = _tail(log_path, 100)

            if _ERROR_PATTERN.search(log_tail):      # 패턴 매칭
                session_errors.append({
                    "timestamp": "...",
                    "source": label,                 # [Backend] / [Frontend] / ...
                    "log_tail": log_tail
                })
                _generate_prompt(session_errors)     # 리포트 갱신
    time.sleep(1.5)
```

### 7-2. 세션 관리

- **시작 시**: `--clear` 플래그 → 모든 `WATCH_TARGETS` 로그 파일 초기화
- **실행 중**: 에러 감지 때마다 `session_errors` 리스트에 누적 (누적 히스토리)
- **디바운스**: 연속 에러 3초 이내 재발생 시 리포트 과다 갱신 방지

---

## 8. `docs/prompts/prompt_for_gemini.md` 리포트 구조

에러 리포트는 LLM이 바로 이해할 수 있는 5개 섹션으로 구성됩니다.

```
[System Prompt]  ← LLM 역할 및 출력 형식 지정
──────────────────────────────────────────────
[Session Meta]   ← 세션 시각, 누적 에러 수
──────────────────────────────────────────────
[Error History]  ← 서비스 레이블이 붙은 에러 스냅샷 목록
  ### [Error] [Backend] 2026-02-19 11:05
      ERROR: column "display_name" does not exist
  ### [Error] [Frontend] 2026-02-19 11:12
      TypeError: Cannot read properties of undefined
──────────────────────────────────────────────
[Source Context] ← 모든 SOURCE_FILES 코드 자동 첨부
  #### backend/schemas.py  (python)
  #### frontend/src/hooks/useStation.ts  (typescript)
──────────────────────────────────────────────
[Instruction]    ← LLM에게 [Antigravity Task] 형식 출력 요청
```

---

## 9. 세션 생명주기: `run_dev.bat`으로 전체 자동화

```batch
:: run_dev.bat — 기술 스택 추가 시 패널만 추가
wt -M -d . --title "Backend" pwsh -NoExit -Command ".\start_backend.bat" ; ^
split-pane -H -p 0 -d . --title "ErrorMonitor" --size 0.2 pwsh -NoExit -Command "backend\.venv\Scripts\python error_monitor.py --clear" ; ^
split-pane -V -p 0 -d . --title "Frontend" pwsh -NoExit -Command ".\start_frontend.bat"
```

```
┌──────────────────────────────────────┐
│  Backend (FastAPI) │ Frontend (Tauri) │
│  localhost:8000    │ localhost:3000   │
├──────────────────────────────────────┤
│          Error Monitor (20%)          │
│  [Backend]  감시: backend/logs/app.log│
│  [Frontend] 감시: frontend/logs/...  │
│  Ctrl+C 종료 | --cleanup 로그 초기화  │
└──────────────────────────────────────┘
```

---

## 10. 어떤 프로젝트에도 적용하는 방법 (Step-by-Step)

**Step 1** `error_monitor.py`를 프로젝트 루트에 복사합니다.

**Step 2** 각 서비스가 **파일로 로그를 출력**하도록 설정합니다. (섹션 4 참조)
- 파일 직접 출력 지원 서비스: 로거에 파일 핸들러 추가
- stdout만 출력하는 서비스: `Tee-Object` (Windows) 또는 `tee` (Linux/Mac) 로 리다이렉트

**Step 3** `WATCH_TARGETS`에 모든 서비스 로그 경로를 등록합니다.
```python
WATCH_TARGETS = {
    "Backend":  Path("backend/logs/app.log"),
    "Frontend": Path("frontend/logs/frontend.log"),
    # "Worker": Path("logs/worker.log"),
    # 추가 서비스를 이 딕셔너리에 계속 추가
}
```

**Step 4** `_ERROR_PATTERN`에 해당 프로젝트의 기술 스택 에러 키워드가 포함되어 있는지 확인합니다. (섹션 5 참조)

**Step 5** `SOURCE_FILES`에 에러와 가장 관련 있는 소스 파일을 등록합니다. (섹션 6 참조)

**Step 6** 개발 시작 스크립트에 에러 모니터를 함께 실행합니다.
```batch
:: Windows: 별도 터미널 창에서
python error_monitor.py --clear
```
```bash
# Mac/Linux: 백그라운드에서
python error_monitor.py --clear &
```

**Step 7** 에러가 발생하면 생성된 `docs/prompts/prompt_for_gemini.md`를 Gemini / NotebookLM에 그대로 붙여넣습니다.

---

## 11. 에이전트 간 통신 프로토콜: `[Antigravity Task]` 형식

LLM 출력 형식 = Agent 입력 형식으로 통일하여 **중간 해석 과정을 제거**합니다.

```markdown
**[Antigravity Task]**
- **근본 원인**: admissions 테이블에 display_name 컬럼이 없음 (DB 스키마 불일치)
- **파일 경로**: backend/schemas.py
- **직접 명령**: display_name 필드를 patient_name_masked로 변경
- **수정 코드**:
  ```diff
  - display_name: str
  + patient_name_masked: str
  ```
```

---

## 12. 핵심 설계 원칙 요약

| 원칙 | 내용 |
|---|---|
| **Zero Dependency** | Python 표준 라이브러리만 사용 |
| **Zero Cost** | LLM API 호출 없음 |
| **Multi-Stack** | `WATCH_TARGETS` 딕셔너리에 항목 추가만으로 어떤 서비스든 확장 |
| **Pattern Completeness** | `_ERROR_PATTERN`이 모든 기술 스택의 에러 형식을 커버 |
| **Context Completeness** | 에러 로그 + 관련 소스 코드 + System Prompt를 1개 파일에 패키징 |
| **Session Continuity** | 에러 누적 히스토리 + 서비스 레이블로 전체 흐름 파악 가능 |
| **Format Contract** | LLM 출력 = Agent 입력 형식 통일, 중간 해석 불필요 |

---

## 13. 한계 및 개선 방향

| 항목 | 내용 |
|---|---|
| **반자동** | 개발자가 리포트를 LLM에 수동 붙여넣기 필요 → 클립보드 자동화로 개선 가능 |
| **노이즈** | 비에러(경고, 정보 로그)도 패턴에 걸릴 수 있음 → 서비스별 패턴 분리로 개선 가능 |
| **UI 부재** | 터미널 텍스트로만 상태 표시 → Flask 기반 웹 대시보드로 개선 가능 |
| **확장성** | 현재 단일 파이썬 스크립트 → 플러그인 구조로 리팩토링 가능 |

---

> **핵심 한 줄 요약**: "모든 기술 스택의 에러를 파일로 수집 → 서비스 레이블·소스 코드와 함께 LLM 최적화 형식으로 통합 패키징 → Agent가 바로 실행할 수 있는 지시 형식으로 답변받기"의 순환을 파일 하나로 구현한 **Zero-Cost, Zero-Dependency, Multi-Stack Agent Bridge 시스템**입니다.
