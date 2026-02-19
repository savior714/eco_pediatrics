"""
eco_pediatrics Error Monitor (Pure-Polling / Multi-Stack)
=========================================================
watchdog 없이 순수 Python 루프로 여러 서비스 로그를 동시에 감시한다.
- 감시 대상 : WATCH_TARGETS 딕셔너리에 등록된 모든 로그 파일
- 에러 패턴 : Python / TypeScript / Tauri(Rust) / Build 도구 공통 커버
- 에러 감지 : prompt_for_gemini.md 를 세션 히스토리 형식으로 자동 갱신

사용법:
    python error_monitor.py          # 모니터 시작
    python error_monitor.py --clear  # 로그 전체 초기화 후 모니터 시작
    python error_monitor.py --cleanup # 로그·리포트 초기화 후 종료

새 서비스 추가:
    WATCH_TARGETS 딕셔너리에 {"서비스명": Path("로그 경로")} 추가
    SOURCE_FILES 리스트에 해당 소스 파일 추가
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import time
from pathlib import Path
from typing import Final

try:
    import winsound
except ImportError:
    winsound = None  # Windows 외 환경 대비

# ---------------------------------------------------------------------------
# 설정
# ---------------------------------------------------------------------------
PROJECT_ROOT: Final[Path] = Path(__file__).parent.resolve()
BACKEND_DIR: Final[Path] = PROJECT_ROOT / "backend"
# 감시할 로그 파일: {레이블: 경로} 형식
WATCH_TARGETS: Final[dict[str, Path]] = {
    "Backend" : (BACKEND_DIR / "logs" / "app.log").resolve(),
    "Frontend": (PROJECT_ROOT / "frontend" / "logs" / "frontend.log").resolve(),
}

# 하위 호환: cleanup에서 사용하는 단일 경로 (백엔드 기준)
WATCH_LOG_PATH: Final[Path] = WATCH_TARGETS["Backend"]
OUTPUT_FILE: Final[Path] = PROJECT_ROOT / "prompt_for_gemini.md"

POLL_INTERVAL: float = 1.5      # 감시 주기 (초)
DEBOUNCE_SEC: float = 3.0       # 중복 생성 방지 간격 (초)
TAIL_LINES: int = 100           # 수집할 최근 로그 줄 수

SOURCE_FILES: Final[list[Path]] = [
    # Backend
    BACKEND_DIR / "main.py",
    BACKEND_DIR / "routers" / "station.py",
    BACKEND_DIR / "routers" / "admissions.py",
    BACKEND_DIR / "routers" / "exams.py",
    BACKEND_DIR / "websocket_manager.py",
    BACKEND_DIR / "utils.py",
    BACKEND_DIR / "models.py",
    BACKEND_DIR / "schemas.py",
    BACKEND_DIR / "constants" / "mappings.py",
    # Frontend (Next.js + Tauri)
    PROJECT_ROOT / "frontend" / "src" / "lib" / "api.ts",
    PROJECT_ROOT / "frontend" / "src" / "hooks" / "useStation.ts",
    PROJECT_ROOT / "frontend" / "src" / "hooks" / "useWebSocket.ts",
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

_ERROR_PATTERN: re.Pattern[str] = re.compile(
    r"\b("
    # Python / Backend
    r"ERROR|CRITICAL|Traceback|Exception|ModuleNotFoundError|AttributeError|ValueError|TypeError"
    r"|"
    # JavaScript / TypeScript / Next.js / Tauri
    r"FAILED|Failed to|Unhandled|Uncaught|SyntaxError|ReferenceError|RangeError"
    r"|"
    # Chromium / Tauri / Rust
    r"panicked|RUST_BACKTRACE|Error =|error\[|ENOENT|ECONNREFUSED"
    r")\b",
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# 유틸리티
# ---------------------------------------------------------------------------
def _tail(path: Path, n: int) -> str:
    """파일 끝부분 n줄을 효율적으로 읽는다."""
    if not path.exists():
        return ""
    try:
        with open(path, "rb") as f:
            f.seek(0, os.SEEK_END)
            filesize = f.tell()
            if filesize == 0:
                return ""
            buf = min(filesize, 1024 * 16)  # 최대 16KB
            f.seek(max(0, filesize - buf))
            data = f.read()
        lines = data.decode("utf-8", errors="replace").splitlines()
        return "\n".join(lines[-n:])
    except Exception as exc:
        return f"[로그 읽기 실패: {exc}]"


def _read_source(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None


def _generate_prompt(session_errors: list[dict[str, str]]) -> None:
    """prompt_for_gemini.md 생성 및 비프음 재생."""
    source_sections: list[str] = []
    for src in SOURCE_FILES:
        code = _read_source(src)
        if code is None:
            continue
        try:
            rel = src.relative_to(PROJECT_ROOT)
        except ValueError:
            rel = src.name
        # 파일 확장자별 코드 블록 언어 태그 분기
        lang = {
            ".ts" : "typescript",
            ".tsx": "typescript",
            ".js" : "javascript",
            ".jsx": "javascript",
            ".rs" : "rust",
            ".sql": "sql",
        }.get(src.suffix, "python")
        source_sections.append(f"#### `{rel}`\n```{lang}\n{code}\n```")

    sources_block = "\n\n".join(source_sections) or "_소스 파일 없음_"

    error_blocks = []
    for err in session_errors:
        source_label = err.get('source', 'Unknown')
        block = f"### [Error] [{source_label}] {err['timestamp']}\n\n```text\n{err['log_tail']}\n```"
        error_blocks.append(block)
    
    errors_content = "\n\n".join(error_blocks) if error_blocks else "_에러 감지 전 (대기 중)_"

    prompt = f"""\
{GEMINI_SYSTEM_PROMPT}

---

# [Session Report] — eco_pediatrics Error Tracker
> Session Started: {time.strftime('%Y-%m-%d %H:%M:%S')}
> Total Errors in Session: {len(session_errors)}

## 1. Session Error History

{errors_content}

## 2. Source Code Context

{sources_block}

---

## 3. Instruction

위 에러 내역(특히 가장 최근 항목)을 분석하고 **[Antigravity Task]** 프로토콜에 맞춰 수정 계획을 제시해 주세요.
"""
    try:
        OUTPUT_FILE.write_text(prompt, encoding="utf-8")
        print(f"\n[✓] {OUTPUT_FILE.name} 업데이트 완료 (에러 수: {len(session_errors)})")
        # Beep disabled per user request
    except OSError as exc:
        print(f"\n[✗] 파일 저장 실패: {exc}")


# ---------------------------------------------------------------------------
# 메인 루프
# ---------------------------------------------------------------------------
def run_monitor(clear_at_start: bool = False) -> None:
    # 모든 감시 대상 디렉터리 생성 및 파일 초기화
    for label, log_path in WATCH_TARGETS.items():
        log_path.parent.mkdir(parents=True, exist_ok=True)
        if not log_path.exists():
            log_path.touch()
        if clear_at_start:
            log_path.write_text("", encoding="utf-8")
            print(f"[✓] [{label}] 시작 시 로그 초기화 완료: {log_path}")

    # 리포트 초기화 (빈 양식으로 시작)
    session_errors: list[dict[str, str]] = []
    _generate_prompt(session_errors)

    print("=" * 60)
    print("  eco_pediatrics Error Monitor (Pure-Polling)")
    print("=" * 60)
    for label, log_path in WATCH_TARGETS.items():
        print(f"  [{label}] 감시: {log_path}")
    print(f"  출력 파일  : {OUTPUT_FILE}")
    print(f"  감시 주기  : {POLL_INTERVAL}s  |  디바운스  : {DEBOUNCE_SEC}s")
    print("-" * 60)
    print("  로그 초기화: python error_monitor.py --cleanup")
    print("  종료       : Ctrl+C")
    print("=" * 60)

    # 각 감시 대상별 마지막 mtime 추적
    last_mtimes: dict[str, float] = {label: 0.0 for label in WATCH_TARGETS}
    last_generated_at: float = 0.0

    while True:
        for label, log_path in WATCH_TARGETS.items():
            try:
                current_mtime = log_path.stat().st_mtime
            except FileNotFoundError:
                continue

            if current_mtime != last_mtimes[label]:
                last_mtimes[label] = current_mtime
                print(f"[*] [{label}] 변경 감지 → 분석 중...  ({time.strftime('%H:%M:%S')})", end="\r")

                log_tail = _tail(log_path, TAIL_LINES)

                if _ERROR_PATTERN.search(log_tail):
                    now = time.monotonic()
                    if now - last_generated_at >= DEBOUNCE_SEC:
                        last_generated_at = now
                        print(f"\n[!] [{label}] 에러 감지 → 세션 리포트 업데이트 중...  ({time.strftime('%H:%M:%S')})")
                        session_errors.append({
                            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                            "source": label,
                            "log_tail": log_tail
                        })
                        _generate_prompt(session_errors)

        time.sleep(POLL_INTERVAL)


# ---------------------------------------------------------------------------
# 엔트리 포인트
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="eco_pediatrics Error Monitor")
    parser.add_argument("--cleanup", action="store_true", help="로그·리포트 파일 초기화 후 종료")
    parser.add_argument("--clear", action="store_true", help="감시 시작 시 기존 로그를 비웁니다.")
    args = parser.parse_args()

    if args.cleanup:
        cleaned = False
        for label, log_path in WATCH_TARGETS.items():
            if log_path.exists():
                log_path.write_text("", encoding="utf-8")
                print(f"[✓] [{label}] 로그 초기화 : {log_path}")
                cleaned = True
        if OUTPUT_FILE.exists():
            OUTPUT_FILE.unlink()
            print(f"[✓] 리포트 삭제 : {OUTPUT_FILE}")
            cleaned = True
        if not cleaned:
            print("[!] 초기화할 파일이 없습니다.")
        sys.exit(0)

    try:
        run_monitor(clear_at_start=args.clear)
    except KeyboardInterrupt:
        print("\n[*] 모니터 종료.")


if __name__ == "__main__":
    main()
