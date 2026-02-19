# Agentic IDE ↔ LLM 순환 디버깅 자동화 시스템
## "Error Monitor" 아키텍처 및 구현 가이드

> **이 문서의 목적**: Antigravity(Agentic IDE)와 Gemini(LLM) 사이의 순환 디버깅 구조를 API 없이 파일 기반으로 자동화한 시스템을 설명하고, 어떤 프로젝트에서도 이를 동일하게 구축할 수 있도록 합니다.

---

## 1. 배경: 왜 이 시스템이 필요했는가?

### 전통적인 개발 디버깅 흐름의 문제점

개발자가 에러를 만났을 때의 일반적인 흐름은 다음과 같습니다.

```
에러 발생 → 로그 확인 → 코드 복사 → LLM에 붙여넣기 → 해결책 얻기 → 코드 수정
```

이 과정에서 **세 가지 반복적인 수작업 병목**이 발생합니다.

1. 로그를 찾아서 복사하는 작업
2. 관련 소스 파일을 함께 붙여넣는 작업
3. LLM의 답변을 다시 IDE로 가져오는 작업

### Agentic IDE 시대의 새로운 문제

`Antigravity` 같은 Agentic IDE는 코드를 자율적으로 수정하는 AI 에이전트를 내장합니다. 그런데 여기에 새로운 아이러니가 생깁니다.

```
Antigravity(Agent)가 코드를 수정 → 백엔드 서버에서 에러 발생 → Antigravity에게 알려야 함
                                   ↑_____________________________________↓
                              (이 사이에 여전히 수작업이 존재!)
```

**핵심 질문**: "에러가 났을 때, Agent에게 에러 내용을 자동으로 맥락과 함께 전달할 수 없을까?"

---

## 2. 선택지 분석: 왜 파일 기반인가?

에러를 LLM에 자동으로 전달하는 방법은 이론적으로 여럿 있습니다.

| 방법 | 설명 | 문제점 |
|---|---|---|
| **LLM API 직접 호출** | 에러 발생 시 Gemini/GPT API로 자동 전송 | 비용 발생, API 키 관리 필요 |
| **IDE 플러그인 작성** | Antigravity의 내부 이벤트 훅 사용 | IDE 내부 구조에 종속적, 불안정 |
| **Webhook 서버** | 에러를 외부 서버로 전송 | 별도 인프라 필요 |
| **📁 파일 기반 (채택)** | 에러를 파일로 기록, IDE가 파일을 감시 | 무료, 범용적, 단순, 안정적 |

> **결론**: API 키 없이 실현 가능한 최선의 방법은 **파일 시스템을 공유 메모리로 활용하는 것**이었습니다.

---

## 3. 시스템 아키텍처: 전체 순환 구조

### 개요 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                    개발 환경 (로컬 머신)                           │
│                                                                 │
│  ┌──────────────┐    ① 코드 실행     ┌─────────────────────┐    │
│  │  Antigravity │ ──────────────────▶│  FastAPI Backend   │    │
│  │  (Agent IDE) │                   │   (app.log 기록)   │    │
│  │              │                   └──────────┬──────────┘    │
│  │              │                              │ ② 에러 발생    │
│  │              │                              ▼               │
│  │              │                   ┌──────────────────────┐  │
│  │              │                   │   error_monitor.py   │  │
│  │              │                   │  (Pure-Polling 감시)  │  │
│  │              │                   └──────────┬───────────┘  │
│  │              │                              │ ③ 리포트 생성  │
│  │              │                              ▼               │
│  │              │  ⑤ 수정 적용       ┌──────────────────────┐  │
│  │  Antigravity │ ◀─────────────────│  prompt_for_gemini   │  │
│  │  에이전트가   │                   │  .md (Context 패키지) │  │
│  │  파일 감지   │                   └──────────┬───────────┘  │
│  └──────────────┘                              │ ④ 개발자가    │
│                                               │  Gemini에 붙여넣기│
│                                               ▼               │
│                                   ┌──────────────────────┐    │
│                                   │   NotebookLM /       │    │
│                                   │   Gemini Web UI      │    │
│                                   │ (해결책 → Antigravity │    │
│                                   │  Task 형식으로 출력)  │    │
│                                   └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 단계별 설명

| 단계 | 주체 | 동작 |
|---|---|---|
| ① | Antigravity | 코드를 수정하고 백엔드 서버를 통해 실행 |
| ② | FastAPI | 에러 발생 시 `loguru`를 통해 `app.log`에 기록 |
| ③ | `error_monitor.py` | `app.log`의 변경을 감지하고 `prompt_for_gemini.md` 자동 생성 |
| ④ | 개발자 | 생성된 파일을 Gemini Web / NotebookLM에 붙여넣기 |
| ⑤ | Gemini | 에러 분석 후 `[Antigravity Task]` 형식으로 수정 지시 출력 |
| ⑥ | Antigravity | 출력된 지시를 받아 코드 수정 자동화 → ①으로 복귀 |

---

## 4. 핵심 컴포넌트: `error_monitor.py` 상세 분석

### 4-1. 파일 감시 메커니즘: Pure-Polling

파일 감시에는 두 가지 방식이 있습니다.

```
방식 A: OS 이벤트 기반 (watchdog 라이브러리)
  → OS가 파일 변경 이벤트를 발생시키면 콜백 실행
  → 문제: Windows에서 네트워크 드라이브나 일부 에디터와 충돌

방식 B: Pure-Polling (채택) ✅
  → 일정 주기(1.5초)마다 파일의 수정 시각(mtime)을 직접 확인
  → 변경이 있으면 내용 분석
  → 100% 이식 가능, 외부 의존성 없음
```

```python
# error_monitor.py 핵심 루프 (단순화)
last_mtime = 0.0

while True:
    current_mtime = WATCH_LOG_PATH.stat().st_mtime  # 수정 시각 확인
    
    if current_mtime != last_mtime:               # 변경이 있으면
        last_mtime = current_mtime
        log_tail = _tail(WATCH_LOG_PATH, 100)     # 최근 100줄 읽기
        
        if _ERROR_PATTERN.search(log_tail):       # 에러 패턴 매칭
            session_errors.append({...})           # 세션에 기록
            _generate_prompt(session_errors)       # 리포트 생성
    
    time.sleep(1.5)  # 1.5초 대기
```

### 4-2. 에러 패턴 감지

단순 "ERROR" 문자열 검색이 아닌, Python 예외 계층 전체를 커버합니다.

```python
_ERROR_PATTERN = re.compile(
    r"\b(ERROR|CRITICAL|Traceback|Exception|Error|
        ModuleNotFoundError|AttributeError|ValueError|TypeError)\b",
    re.IGNORECASE,
)
```

### 4-3. 효율적인 로그 읽기: Seek-based Tail

수십MB에 달할 수 있는 로그 파일 전체를 읽지 않고, **파일의 끝부분만 빠르게 읽습니다**.

```python
def _tail(path: Path, n: int) -> str:
    with open(path, "rb") as f:
        f.seek(0, os.SEEK_END)        # 파일 끝으로 이동
        buf = min(filesize, 1024*16)  # 최대 16KB만 읽음
        f.seek(max(0, filesize - buf))
        data = f.read()
    return "\n".join(data.decode().splitlines()[-n:])  # 끝 n줄만 반환
```

### 4-4. 세션 기반 에러 누적

단순히 마지막 에러를 덮어쓰는 대신, 한 세션(배치 실행~종료)의 모든 에러를 누적 저장합니다.

```python
session_errors: list[dict[str, str]] = []

# 에러 감지 시
session_errors.append({
    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    "log_tail": log_tail  # 에러 당시의 로그 스냅샷
})
_generate_prompt(session_errors)  # 전체 히스토리를 포함해 리포트 재생성
```

**이점**: 에러 간의 인과관계 파악 가능. "첫 번째 에러가 두 번째 에러를 유발했다"는 패턴을 LLM이 포착할 수 있게 됩니다.

### 4-5. 디바운스 (중복 방지)

로그가 폭발적으로 생성될 때 리포트가 과도하게 갱신되지 않도록 최소 3초 간격을 강제합니다.

```python
DEBOUNCE_SEC = 3.0
if time.monotonic() - last_generated_at >= DEBOUNCE_SEC:
    _generate_prompt(session_errors)
    last_generated_at = time.monotonic()
```

---

## 5. 핵심 컴포넌트: `prompt_for_gemini.md` 상세 분석

### 파일의 역할

이 파일은 단순한 로그 덤프가 아닌, **LLM에 최적화된 구조화된 Context 패키지**입니다.

### 파일 구조

```markdown
[섹션 1: System Prompt] ← LLM에게 역할과 출력 형식을 지정
--------------------------------------------------------------
**[Agent-to-Agent Protocol]**
> Role: Senior Architect & Code Reviewer
> 답변은 반드시 [Antigravity Task] 블록 형식으로

[섹션 2: Session Meta] ← 세션 시작 시각, 누적 에러 수
--------------------------------------------------------------
# [Session Report]
> Session Started: 2026-02-19 11:00:00
> Total Errors in Session: 2

[섹션 3: Error History] ← 시간 순 에러 스냅샷 목록
--------------------------------------------------------------
### [Error] 2026-02-19 11:05:30
```text
ERROR: admissions.display_name does not exist (code: 42703)
```

### [Error] 2026-02-19 11:12:00
```text  
ERROR: NoneType has no attribute 'room_number'
```

[섹션 4: Source Code Context] ← 관련 소스 코드 전체 자동 첨부
--------------------------------------------------------------
#### `backend/main.py`
```python
... (전체 코드)
```

#### `backend/schemas.py`
```python
... (전체 코드)
```

[섹션 5: Instruction] ← LLM에게 정확한 작업 지시
--------------------------------------------------------------
위 에러 내역(특히 가장 최근 항목)을 분석하고
[Antigravity Task] 프로토콜에 맞춰 수정 계획을 제시해 주세요.
```

### 왜 이 구조인가?

1. **System Prompt 선행**: 명확한 역할 부여로 답변 형식을 고정
2. **소스 코드 자동 첨부**: 개발자가 수동으로 파일을 복사할 필요 없음
3. **에러 히스토리**: 단발 에러가 아닌 흐름을 분석 가능
4. **`[Antigravity Task]` 출력 형식 강제**: LLM의 답변이 곧 Agent에게 입력될 수 있는 형식

---

## 6. 에이전트 간 통신 프로토콜: `[Antigravity Task]` 형식

이 시스템의 핵심적인 설계 철학은 **LLM의 출력 형식을 Agent의 입력 형식으로 통일**하는 것입니다.

```markdown
**[Antigravity Task]**
- **근본 원인**: admissions 테이블에 display_name 컬럼이 없음 (DB 스키마 불일치)
- **파일 경로**: backend/schemas.py, backend/services/dashboard.py
- **직접 명령**: schemas.py의 display_name 필드를 patient_name_masked로 변경하고 dashboard.py 쿼리에서 display_name 제거
- **수정 코드**:
  ```diff
  - display_name: str
  + patient_name_masked: str
  ```
```

Gemini가 이 형식으로 출력하면, 개발자는 그 내용을 그대로 Antigravity에게 붙여넣기만 하면 됩니다. **중간 해석 과정이 없습니다.**

---

## 7. 세션 생명주기: `run_dev.bat`으로 전체 자동화

개발 환경을 실행하는 배치 파일이 이 시스템의 시작점입니다.

```batch
:: run_dev.bat
wt -M -d . --title "Backend" pwsh -NoExit -Command ".\start_backend.bat" ; ^
split-pane -H --title "ErrorMonitor" --size 0.2 \
    pwsh -NoExit -Command "backend\.venv\Scripts\python error_monitor.py --clear" ; ^
split-pane -V --title "Frontend" pwsh -NoExit -Command ".\start_frontend.bat"
```

**`--clear` 플래그 효과**:
1. 실행 직후 `app.log` 완전 초기화 → 이전 세션 노이즈 제거
2. `prompt_for_gemini.md`를 빈 템플릿으로 초기화
3. `session_errors = []` 새 배열로 세션 시작

이로써 **배치 파일 실행 = 새 디버깅 세션 시작**이 자동으로 연결됩니다.

---

## 8. 어떤 프로젝트에도 적용하는 방법

### 요구 사항

| 항목 | 필요 조건 |
|---|---|
| 런타임 | Python 3.8+ (표준 라이브러리만 사용) |
| 로그 방식 | 파일 기반 로그 (`app.log` 등) |
| 비용 | **$0** (외부 API, 라이브러리 없음) |
| 필요 파일 | `error_monitor.py` 1개 |

### 프로젝트 적용 체크리스트

**Step 1**: `error_monitor.py`를 프로젝트 루트에 복사합니다.

**Step 2**: 상단 설정 섹션을 프로젝트에 맞게 수정합니다.

```python
# ↓ 이 4개 값만 수정하면 됩니다 ↓

# 감시할 로그 파일 경로
WATCH_LOG_PATH = Path("your_project/logs/app.log")

# 생성될 리포트 파일 경로
OUTPUT_FILE = Path("prompt_for_your_llm.md")

# LLM에 첨부할 소스 파일 목록
SOURCE_FILES = [
    Path("your_project/main.py"),
    Path("your_project/models.py"),
    # 에러와 관련될 가능성이 높은 파일들
]

# 에러 감지 패턴 (기본값 그대로 사용 가능)
_ERROR_PATTERN = re.compile(
    r"\b(ERROR|CRITICAL|Traceback|Exception|Error)\b",
    re.IGNORECASE,
)
```

**Step 3**: 개발 시작 스크립트에 에러 모니터를 함께 실행합니다.

```batch
:: Windows (cmd/bat)
start "Error Monitor" python error_monitor.py --clear
```

```bash
# Mac/Linux
python error_monitor.py --clear &
```

```json
// VS Code tasks.json
{
  "label": "Start Error Monitor",
  "type": "shell",
  "command": "python error_monitor.py --clear",
  "runOptions": { "runOn": "folderOpen" }
}
```

**Step 4**: `GEMINI_SYSTEM_PROMPT` 안에 여러분의 프로젝트 Agent 또는 AI 도구에 맞는 출력 형식 지시를 작성합니다.

```python
GEMINI_SYSTEM_PROMPT = """
[여기에 사용하시는 AI 도구에 맞는 출력 형식 지시 작성]
예:
- Cursor를 쓰신다면: Cursor의 채팅 명령 형식에 맞게
- GitHub Copilot을 쓰신다면: 해당 형식에 맞게
- Antigravity를 쓰신다면: [Antigravity Task] 형식
"""
```

**Step 5**: 에러가 발생하면 생성된 `.md` 파일을 열어 Gemini, NotebookLM, 또는 다른 LLM에 그대로 붙여넣습니다. (복사 1번이면 충분)

---

## 9. 핵심 설계 원칙 요약

| 원칙 | 내용 |
|---|---|
| **Zero Dependency** | `watchdog` 등 외부 라이브러리 없이 Python 표준 라이브러리만 사용 |
| **Zero Cost** | LLM API 호출 없음, 파일 I/O만 사용 |
| **Context Completeness** | 에러 로그 + 소스 코드 + System Prompt를 하나의 파일에 패키징 |
| **Session Continuity** | 세션 내 에러 히스토리를 누적하여 에러 간 인과관계 제공 |
| **Format Contract** | LLM 출력 형식 = Agent 입력 형식으로 통일하여 중간 해석 제거 |
| **One-click UX** | 배치 파일 실행 하나로 전체 환경을 초기화하고 모니터링 시작 |

---

## 10. 한계 및 개선 방향

### 현재 한계

- **단방향**: 여전히 개발자가 리포트를 LLM에 수동으로 붙여넣어야 함
- **UI 부재**: 터미널 텍스트로만 상태 표시
- **단일 로그 파일**: 여러 서비스의 로그를 동시에 감시하지 못함

### 가능한 다음 단계

| 개선 | 방법 |
|---|---|
| 완전 자동화 | OS 클립보드 API로 리포트를 자동 복사 또는 브라우저 자동 열기 |
| 다중 로그 | `SOURCE_FILES`처럼 `WATCH_LOG_PATHS` 리스트로 확장 |
| 필터링 | 특정 에러 패턴만 리포트에 포함하는 화이트리스트 추가 |
| 웹 UI | Flask/FastAPI 소규모 서버로 브라우저에서 실시간 에러 확인 |

---

> **핵심 한 줄 요약**: "에러 로그를 자동으로 감시 → 소스 코드와 함께 LLM 최적화 형식으로 패키징 → Agent가 바로 실행할 수 있는 지시 형식으로 답변받기"의 3단계 순환을 파일 하나로 구현한 Zero-Cost Agent-to-Agent Bridge 시스템입니다.
