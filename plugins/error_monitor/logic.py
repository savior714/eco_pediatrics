import time
from .definition import (
    WATCH_TARGETS, OUTPUT_FILE, SOURCE_FILES, POLL_INTERVAL,
    DEBOUNCE_SEC, TAIL_LINES, GEMINI_SYSTEM_PROMPT, ERROR_PATTERN, PROJECT_ROOT
)
from .repository import LogRepository

class ErrorMonitorService:
    def __init__(self):
        self.session_errors: list[dict[str, str]] = []
        self.last_mtimes: dict[str, float] = {label: 0.0 for label in WATCH_TARGETS}
        self.last_generated_at: float = 0.0

    def generate_prompt(self) -> None:
        source_sections: list[str] = []
        for src in SOURCE_FILES:
            code = LogRepository.read_source(src)
            if code is None:
                continue
            
            try:
                rel = src.relative_to(PROJECT_ROOT)
            except ValueError:
                rel = src.name
                
            lang = {
                ".ts" : "typescript", ".tsx": "typescript",
                ".js" : "javascript", ".jsx": "javascript",
                ".rs" : "rust", ".sql": "sql",
            }.get(src.suffix, "python")
            
            source_sections.append(f"#### `{rel}`\n```{lang}\n{code}\n```")

        sources_block = "\n\n".join(source_sections) or "_소스 파일 없음_"

        error_blocks = []
        for err in self.session_errors:
            source_label = err.get('source', 'Unknown')
            block = f"### [Error] [{source_label}] {err['timestamp']}\n\n```text\n{err['log_tail']}\n```"
            error_blocks.append(block)
        
        errors_content = "\n\n".join(error_blocks) if error_blocks else "_에러 감지 전 (대기 중)_"

        prompt = f"""\
{GEMINI_SYSTEM_PROMPT}

---

# [Session Report] — eco_pediatrics Error Tracker
> Session Started: {time.strftime('%Y-%m-%d %H:%M:%S')}
> Total Errors in Session: {len(self.session_errors)}

## 1. Session Error History

{errors_content}

## 2. Source Code Context

{sources_block}

---

## 3. Instruction

위 에러 내역(특히 가장 최근 항목)을 분석하고 **[Antigravity Task]** 프로토콜에 맞춰 수정 계획을 제시해 주세요. (답변받는 agent가 cursor-small, cursor-small-v2 정도의 agent임을 감안하고 답변해줄 것, 나눠서 해야하는 것이면 todolist화 해서)
"""
        if LogRepository.write_prompt(OUTPUT_FILE, prompt):
            print(f"\n[✓] {OUTPUT_FILE.name} 업데이트 완료 (에러 수: {len(self.session_errors)})")

    def run(self, clear_at_start: bool = False) -> None:
        for label, log_path in WATCH_TARGETS.items():
            log_path.parent.mkdir(parents=True, exist_ok=True)
            if not log_path.exists():
                log_path.touch()
            if clear_at_start:
                log_path.write_text("", encoding="utf-8")
                print(f"[✓] [{label}] 시작 시 로그 초기화 완료: {log_path}")

        self.generate_prompt()

        print("=" * 60)
        print("  eco_pediatrics Error Monitor (Plugins Architecture)")
        print("=" * 60)
        for label, log_path in WATCH_TARGETS.items():
            print(f"  [{label}] 감시: {log_path}")
        print(f"  출력 파일  : {OUTPUT_FILE}")
        print(f"  감시 주기  : {POLL_INTERVAL}s  |  디바운스  : {DEBOUNCE_SEC}s")
        print("-" * 60)
        print("  로그 초기화: python -m plugins.error_monitor --cleanup")
        print("  종료       : Ctrl+C")
        print("=" * 60)

        while True:
            for label, log_path in WATCH_TARGETS.items():
                try:
                    current_mtime = log_path.stat().st_mtime
                except FileNotFoundError:
                    continue

                if current_mtime != self.last_mtimes[label]:
                    self.last_mtimes[label] = current_mtime
                    print(f"[*] [{label}] 변경 감지 → 분석 중...  ({time.strftime('%H:%M:%S')})", end="\r")

                    log_tail = LogRepository.read_tail(log_path, TAIL_LINES)

                    if ERROR_PATTERN.search(log_tail):
                        now = time.monotonic()
                        if now - self.last_generated_at >= DEBOUNCE_SEC:
                            self.last_generated_at = now
                            print(f"\n[!] [{label}] 에러 감지 → 세션 리포트 업데이트 중...  ({time.strftime('%H:%M:%S')})")
                            self.session_errors.append({
                                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                                "source": label,
                                "log_tail": log_tail
                            })
                            self.generate_prompt()

            time.sleep(POLL_INTERVAL)
