# Agentic IDE ↔ LLM 순환 디버깅 자동화 시스템
## "Error Monitor" 아키텍처 및 구현 가이드 (v2 — Full-Stack Edition)

> **이 문서의 목적**: Antigravity(Agentic IDE)와 Gemini(LLM) 사이의 순환 디버깅 구조를 API 없이 파일 기반으로 자동화한 시스템을 설명하고, 어떤 프로젝트에서도 이를 동일하게 구축할 수 있도록 합니다.

---

## 1. 배경: 왜 이 시스템이 필요했는가?

### 전통적인 개발 디버깅 흐름의 문제점

```
에러 발생 → 로그 확인 → 코드 복사 → LLM에 붙여넣기 → 해결책 얻기 → 코드 수정
```

이 과정에서 **세 가지 반복적인 수작업 병목**이 발생합니다.

1. 로그를 찾아서 복사하는 작업
2. 관련 소스 파일을 함께 붙여넣는 작업  
3. LLM의 답변을 다시 IDE로 가져오는 작업

### Agentic IDE 시대의 새로운 문제

`Antigravity` 같은 Agentic IDE는 코드를 자율적으로 수정하는 AI 에이전트를 내장합니다. 여기에 새로운 아이러니가 생깁니다.

```
Antigravity(Agent)가 코드를 수정 → 프론트/백엔드에서 에러 발생 → Antigravity에게 알려야 함
                                   ↑_________________________________________↓
                                           (이 사이에 여전히 수작업 존재!)
```

---

## 2. 선택지 분석: 왜 파일 기반인가?

| 방법 | 설명 | 문제점 |
|---|---|---|
| **LLM API 직접 호출** | 에러 발생 시 Gemini/GPT API로 자동 전송 | 비용 발생, API 키 관리 필요 |
| **IDE 플러그인 작성** | Antigravity의 내부 이벤트 훅 사용 | IDE 내부 구조에 종속적, 불안정 |
| **Webhook 서버** | 에러를 외부 서버로 전송 | 별도 인프라 필요 |
| **📁 파일 기반 (채택)** | 에러를 파일로 기록, IDE가 파일을 감시 | 무료, 범용적, 단순, 안정적 |

> **결론**: API 키 없이 실현 가능한 최선의 방법은 **파일 시스템을 공유 메모리로 활용**하는 것입니다.

---

## 3. 시스템 아키텍처: 전체 순환 구조

### 개요 다이어그램

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          개발 환경 (로컬 머신)                              │
│                                                                          │
│  ┌──────────────┐  ① 코드 실행  ┌─────────────┐  ┌──────────────────┐   │
│  │  Antigravity │──────────────▶│FastAPI(BE)  │  │  Next.js + Tauri │   │
│  │  (Agent IDE) │               │ app.log 기록 │  │  (FE) 콘솔 출력   │   │
│  │              │               └──────┬──────┘  └────────┬─────────┘   │
│  │              │                      │ ② 서비스별           │ ② 에러 발생  │
│  │              │               ② 에러 발생     ▼               │           │
│  │              │                      │      frontend.log ◀──┘           │
│  │              │                      │      (Tee-Object 방식 캡처)        │
│  │              │                      ▼               ▼                  │
│  │              │               ┌─────────────────────────────┐          │
│  │              │               │     error_monitor.py        │          │
│  │              │               │ WATCH_TARGETS = {           │          │
│  │              │               │   "Backend":  app.log,     │          │
│  │              │               │   "Frontend": frontend.log │          │
│  │              │               │ }  (Pure-Polling 멀티 감시)  │          │
│  │              │               └──────────────┬──────────────┘          │
│  │              │                              │ ③ 리포트 생성             │
│  │              │  ⑤ 수정 적용                  ▼                         │
│  │  Antigravity │ ◀──────────────── prompt_for_gemini.md                 │
│  │  에이전트가   │                   (Context 패키지 — 전/백엔드 통합)        │
│  │  파일 감지   │                              │ ④ 개발자가                │
│  └──────────────┘                              │   Gemini에 붙여넣기       │
│                                               ▼                         │
│                                   ┌──────────────────────┐              │
│                                   │  NotebookLM / Gemini │              │
│                                   │  → [Antigravity Task]│              │
│                                   │  형식으로 수정 지시 출력│              │
│                                   └──────────────────────┘              │
└──────────────────────────────────────────────────────────────────────────┘
```

### 단계별 설명

| 단계 | 주체 | 동작 |
|---|---|---|
| ① | Antigravity | 코드 수정 후 백엔드/프론트엔드 서버 실행 |
| ② | FastAPI / Next.js | 에러 발생 시 각자의 로그 파일에 기록 |
| ③ | `error_monitor.py` | 두 로그 파일을 동시에 감시하고, 에러 감지 시 `prompt_for_gemini.md` 자동 생성 |
| ④ | 개발자 | **파일 1개**를 Gemini에 붙여넣기 (서비스 구분 없이 통합 컨텍스트 제공) |
| ⑤ | Gemini | 에러 분석 후 `[Antigravity Task]` 형식으로 수정 지시 출력 |
| ⑥ | Antigravity | 출력된 지시를 받아 코드 수정 → ①으로 복귀 |

---

## 4. 핵심 컴포넌트: `error_monitor.py` 상세 분석

### 4-1. 설정: WATCH_TARGETS (멀티 로그 감시)

단일 로그 경로 대신, **딕셔너리 형태**로 여러 서비스의 로그를 동시에 등록합니다.

```python
# 감시할 로그 파일: {레이블: 경로} 형식
WATCH_TARGETS: Final[dict[str, Path]] = {
    "Backend" : (BACKEND_DIR / "logs" / "app.log").resolve(),
    "Frontend": (PROJECT_ROOT / "frontend" / "logs" / "frontend.log").resolve(),
}
```

새로운 서비스(예: Worker, Celery)를 추가할 때는 이 딕셔너리에 항목만 추가하면 됩니다. **모니터 로직은 전혀 수정할 필요가 없습니다.**

### 4-2. 설정: SOURCE_FILES (풀스택 소스 컨텍스트)

LLM에 첨부되는 소스 파일 목록에 백엔드와 프론트엔드를 모두 포함합니다.

```python
SOURCE_FILES: Final[list[Path]] = [
    # Backend
    BACKEND_DIR / "main.py",
    BACKEND_DIR / "schemas.py",
    BACKEND_DIR / "models.py",
    # ... 기타 백엔드 파일 ...

    # Frontend (Next.js + Tauri)
    PROJECT_ROOT / "frontend" / "src" / "lib" / "api.ts",
    PROJECT_ROOT / "frontend" / "src" / "hooks" / "useStation.ts",
    PROJECT_ROOT / "frontend" / "src" / "hooks" / "useWebSocket.ts",
    PROJECT_ROOT / "frontend" / "src" / "types" / "domain.ts",
]
```

### 4-3. 파일 감시 메커니즘: Pure-Polling

```
방식 A: OS 이벤트 기반 (watchdog 라이브러리)
  → Windows에서 네트워크 드라이브나 일부 에디터와 충돌 가능

방식 B: Pure-Polling (채택) ✅
  → 일정 주기(1.5초)마다 파일의 수정 시각(mtime)을 직접 확인
  → 100% 이식 가능, 외부 의존성 없음
```

### 4-4. 멀티 루프 구조

`WATCH_TARGETS`를 순회하며 **모든 서비스 로그를 하나의 루프에서 감시**합니다.

```python
# 각 감시 대상별 마지막 mtime 추적
last_mtimes: dict[str, float] = {label: 0.0 for label in WATCH_TARGETS}

while True:
    for label, log_path in WATCH_TARGETS.items():  # ← 멀티 감시 핵심
        current_mtime = log_path.stat().st_mtime
        
        if current_mtime != last_mtimes[label]:    # 변경 감지
            log_tail = _tail(log_path, 100)        # 최근 100줄
            
            if _ERROR_PATTERN.search(log_tail):    # 에러 패턴 매칭
                session_errors.append({
                    "timestamp": "...",
                    "source": label,               # ← [Backend] / [Frontend] 레이블
                    "log_tail": log_tail
                })
                _generate_prompt(session_errors)
    
    time.sleep(1.5)
```

### 4-5. 에러 패턴 감지

Python 예외 계층 전체 + 일반 에러 키워드를 커버합니다.

```python
_ERROR_PATTERN = re.compile(
    r"\b(ERROR|CRITICAL|Traceback|Exception|Error|
        ModuleNotFoundError|AttributeError|ValueError|TypeError)\b",
    re.IGNORECASE,
)
```

> **프론트엔드(TypeScript)**의 경우 `Error`, `TypeError`, `Uncaught`, `FAILED` 등이 콘솔 로그에 포함되어 감지됩니다.

### 4-6. 세션 기반 에러 누적

단순히 마지막 에러를 덮어쓰지 않고 **한 세션의 모든 에러를 시간 순으로 누적** 저장합니다.

```python
session_errors: list[dict[str, str]] = []

# 에러 감지 시 (출처 레이블 포함)
session_errors.append({
    "timestamp": "2026-02-19 11:40:00",
    "source": "Frontend",            # 어느 서비스에서 발생했는지
    "log_tail": "...(로그 스냅샷)..."
})
```

### 4-7. 디바운스 (중복 방지)

에러가 연속 발생할 때 리포트가 과도하게 갱신되지 않도록 3초 간격을 강제합니다.

```python
DEBOUNCE_SEC = 3.0
if time.monotonic() - last_generated_at >= DEBOUNCE_SEC:
    _generate_prompt(session_errors)
```

---

## 5. 핵심 컴포넌트: `prompt_for_gemini.md` 상세 분석

### 파일 구조

```markdown
[섹션 1: System Prompt]  ← LLM에게 역할과 출력 형식을 지정
---
**[Agent-to-Agent Protocol]**
> Role: Senior Architect & Code Reviewer
> 답변은 반드시 [Antigravity Task] 블록 형식으로

[섹션 2: Session Meta]  ← 세션 시작 시각, 누적 에러 수
---
# [Session Report]
> Session Started: 2026-02-19 11:00:00
> Total Errors in Session: 2

[섹션 3: Session Error History]  ← 서비스 출처가 표시된 에러 스냅샷 목록
---
### [Error] [Backend] 2026-02-19 11:05:30
```text
ERROR: admissions.display_name does not exist (code: 42703)
```

### [Error] [Frontend] 2026-02-19 11:12:00
```text
TypeError: Cannot read properties of undefined (reading 'room_number')
```

[섹션 4: Source Code Context]  ← 백엔드 + 프론트엔드 소스 코드 자동 첨부
---
#### `backend/schemas.py`
```python
... (전체 코드 자동 삽입)
```

#### `frontend/src/hooks/useStation.ts`
```typescript
... (전체 코드 자동 삽입)
```

[섹션 5: Instruction]  ← LLM에게 정확한 작업 지시
---
위 에러 내역(특히 가장 최근 항목)을 분석하고
[Antigravity Task] 프로토콜에 맞춰 수정 계획을 제시해 주세요.
```

---

## 6. 프론트엔드 로그 캡처: `start_frontend.bat`

Next.js + Tauri dev 서버의 출력은 기본적으로 터미널 stdout으로만 나옵니다. 이를 파일에도 기록하기 위해 PowerShell의 `Tee-Object`를 사용합니다.

```batch
:: start_frontend.bat
if not exist logs mkdir logs
powershell -Command "npm run tauri dev 2>&1 | Tee-Object -FilePath '.\logs\frontend.log' -Append"
```

- `2>&1`: stderr(에러 출력)까지 합쳐서 캡처
- `Tee-Object`: 화면 출력과 파일 저장을 동시에 수행 (비침습적)
- `-Append`: 기존 파일에 이어쓰기 (세션 전체 기록 유지)

---

## 7. 세션 생명주기: `run_dev.bat`으로 전체 자동화

```batch
:: run_dev.bat
wt -M -d . --title "Backend"      pwsh -NoExit -Command ".\start_backend.bat" ; ^
split-pane -H --title "ErrorMonitor" --size 0.2 ^
           pwsh -NoExit -Command "backend\.venv\Scripts\python error_monitor.py --clear" ; ^
split-pane -V --title "Frontend"   pwsh -NoExit -Command ".\start_frontend.bat"
```

**`--clear` 플래그 효과**:
1. 모든 `WATCH_TARGETS` 로그 파일을 초기화 → 이전 세션 노이즈 제거
2. `prompt_for_gemini.md`를 빈 템플릿으로 초기화
3. `session_errors = []`로 새 세션 시작

**레이아웃**:
```
┌─────────────────────────────────┐
│ Backend (FastAPI)  │ Frontend    │
│ http://localhost:8000│ (Tauri)  │
├─────────────────────────────────┤
│     Error Monitor (20% 높이)     │
│  [Backend] 감시: ...app.log     │
│  [Frontend] 감시: ...frontend.log│
└─────────────────────────────────┘
```

---

## 8. 어떤 프로젝트에도 적용하는 방법

### 요구 사항

| 항목 | 필요 조건 |
|---|---|
| 런타임 | Python 3.8+ (표준 라이브러리만 사용) |
| 로그 방식 | 파일 기반 로그 (loguru, logging 등) |
| 프론트엔드 | stdout을 파일로 Tee 가능한 환경 |
| 비용 | **$0** |

### Step-by-Step

**Step 1**: `error_monitor.py`를 프로젝트 루트에 복사합니다.

**Step 2**: `WATCH_TARGETS`를 프로젝트에 맞게 수정합니다.

```python
WATCH_TARGETS = {
    # 서비스 이름: 로그 파일 경로
    "Backend": Path("backend/logs/app.log"),
    "Frontend": Path("frontend/logs/dev.log"),
    # "Worker": Path("worker/logs/celery.log"),  # 추가 서비스 예시
}
```

**Step 3**: `SOURCE_FILES`에 핵심 소스 파일을 등록합니다.

```python
SOURCE_FILES = [
    # 에러와 관련될 가능성이 높은 파일들
    Path("backend/main.py"),
    Path("backend/models.py"),
    Path("frontend/src/lib/api.ts"),
    Path("frontend/src/hooks/useWebSocket.ts"),
    # ...
]
```

**Step 4**: 프론트엔드 실행 스크립트에서 stdout을 파일로 캡처합니다.

```bash
# Mac/Linux
npm run dev 2>&1 | tee -a frontend/logs/frontend.log
```

```batch
:: Windows
powershell -Command "npm run dev 2>&1 | Tee-Object -FilePath 'frontend\logs\frontend.log' -Append"
```

**Step 5**: 개발 시작 스크립트에 에러 모니터를 함께 실행합니다.

```batch
:: Windows Terminal 멀티 패널
wt python error_monitor.py --clear
```

```bash
# Mac/Linux
python error_monitor.py --clear &
```

**Step 6** (선택): `GEMINI_SYSTEM_PROMPT`를 사용하시는 AI 도구의 출력 형식에 맞게 수정합니다.

---

## 9. 에이전트 간 통신 프로토콜: `[Antigravity Task]` 형식

LLM의 출력 형식을 Agent의 입력 형식으로 통일하여 **중간 해석 과정을 제거**합니다.

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

Gemini가 이 형식으로 출력하면, 개발자는 그 내용을 Antigravity에게 그대로 붙여넣기만 하면 됩니다.

---

## 10. 핵심 설계 원칙 요약

| 원칙 | 내용 |
|---|---|
| **Zero Dependency** | Python 표준 라이브러리만 사용, 외부 패키지 불필요 |
| **Zero Cost** | LLM API 호출 없음, 파일 I/O만 사용 |
| **Multi-Target** | `WATCH_TARGETS` 딕셔너리로 서비스 확장이 자유로움 |
| **Context Completeness** | 에러 로그 + 전/백엔드 소스 코드 + System Prompt를 1개 파일에 패키징 |
| **Session Continuity** | 세션 내 에러 히스토리 누적, 에러 발생 서비스 레이블 포함 |
| **Format Contract** | LLM 출력 형식 = Agent 입력 형식으로 통일, 중간 해석 제거 |
| **One-click UX** | 배치 파일 실행 하나로 전체 환경 초기화 및 모니터링 시작 |

---

## 11. 한계 및 개선 방향

### 현재 한계

- **반자동**: 개발자가 리포트를 LLM에 수동으로 붙여넣어야 함
- **프론트엔드 필터 부족**: TypeScript 컴파일 경고 등 비에러 출력도 캡처될 수 있음
- **UI 부재**: 터미널 텍스트로만 상태 표시

### 가능한 다음 단계

| 개선 | 방법 |
|---|---|
| 완전 자동화 | OS 클립보드 API로 리포트를 자동 복사 또는 브라우저 자동 열기 |
| 프론트엔드 필터링 | TypeScript 에러 전용 패턴 추가 (`TS\d{4}`, `Error:` 등) |
| 다중 서비스 확장 | `WATCH_TARGETS`에 Worker, DB 등 추가만으로 완성 |
| 웹 UI | Flask 소규모 서버로 브라우저에서 실시간 에러 현황 확인 |

---

> **핵심 한 줄 요약**: "백엔드·프론트엔드 모든 서비스의 에러를 자동 감지 → 출처 레이블과 함께 소스 코드를 통합 패키징 → Agent가 바로 실행할 수 있는 지시 형식으로 답변받기"의 순환을 파일 2개로 구현한 Zero-Cost Full-Stack Agent Bridge 시스템입니다.
