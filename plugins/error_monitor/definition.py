import re
from pathlib import Path
from typing import Final

# 폴더 구조 변경(plugins/error_monitor)에 따라 PROJECT_ROOT 계산 수정 (부모의 부모)
PROJECT_ROOT: Final[Path] = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR: Final[Path] = PROJECT_ROOT / "backend"

WATCH_TARGETS: Final[dict[str, Path]] = {
    "Backend" : (BACKEND_DIR / "logs" / "app.log").resolve(),
    "Frontend": (PROJECT_ROOT / "frontend" / "logs" / "frontend.log").resolve(),
}

OUTPUT_FILE: Final[Path] = PROJECT_ROOT / "docs" / "prompts" / "prompt_for_gemini.md"

POLL_INTERVAL: float = 1.5
DEBOUNCE_SEC: float = 3.0
TAIL_LINES: int = 100

SOURCE_FILES: Final[list[Path]] = [
    BACKEND_DIR / "main.py",
    BACKEND_DIR / "routers" / "station.py",
    BACKEND_DIR / "routers" / "admissions.py",
    BACKEND_DIR / "routers" / "exams.py",
    BACKEND_DIR / "websocket_manager.py",
    BACKEND_DIR / "utils.py",
    BACKEND_DIR / "models.py",
    BACKEND_DIR / "schemas.py",
    BACKEND_DIR / "constants" / "mappings.py",
    PROJECT_ROOT / "frontend" / "src" / "lib" / "api.ts",
    PROJECT_ROOT / "frontend" / "src" / "hooks" / "useStation.ts",
    PROJECT_ROOT / "frontend" / "src" / "hooks" / "useWebSocket.ts",
    PROJECT_ROOT / "frontend" / "src" / "hooks" / "useVitals.ts",
    PROJECT_ROOT / "frontend" / "src" / "hooks" / "useDashboardStats.ts",
    PROJECT_ROOT / "frontend" / "src" / "types" / "domain.ts",
]

GEMINI_SYSTEM_PROMPT: Final[str] = """\
**[Agent-to-Agent Protocol]**
> Role: Senior Architect & Code Reviewer
> 모든 기술적 해결책은 아래 [Antigravity Task] 블록 형식을 반드시 준수한다.
>
> **[Antigravity Task]**
> - **근본 원인**: 문제의 핵심 원인 한 줄 요약
> - **파일 경로**: 수정이 필요한 파일 상대 경로
> - **직접 명령**: Antigravity Agent 에게 내릴 구체적 Instruction
> - **수정 코드**: `diff` 또는 최소한의 교체 로직만 제공 (전체 코드 재출력 금지)
"""

ERROR_PATTERN: re.Pattern[str] = re.compile(
    r"\b("
    r"ERROR|CRITICAL|Traceback|Exception|ModuleNotFoundError|AttributeError|ValueError|TypeError"
    r"|"
    r"FAILED|Failed to|Unhandled|Uncaught|SyntaxError|ReferenceError|RangeError"
    r"|"
    r"panicked|RUST_BACKTRACE|Error =|error\[|ENOENT|ECONNREFUSED"
    r")\b",
    re.IGNORECASE,
)
