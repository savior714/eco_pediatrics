import os
from pathlib import Path

class LogRepository:
    @staticmethod
    def read_tail(path: Path, n: int) -> str:
        if not path.exists():
            return ""
        try:
            with open(path, "rb") as f:
                f.seek(0, os.SEEK_END)
                filesize = f.tell()
                if filesize == 0:
                    return ""
                buf = min(filesize, 1024 * 16)
                f.seek(max(0, filesize - buf))
                data = f.read()

            try:
                decoded = data.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    decoded = data.decode("utf-16-le")
                except UnicodeDecodeError:
                    decoded = data.decode("utf-8", errors="replace")

            lines = decoded.splitlines()
            return "\n".join(lines[-n:])
        except Exception as exc:
            print(f"[!] 로그 읽기 실패 ({path.name}): {exc}")
            return f"[로그 읽기 실패: {exc}]"

    @staticmethod
    def read_source(path: Path) -> str | None:
        try:
            return path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return None

    @staticmethod
    def write_prompt(path: Path, content: str) -> bool:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            return True
        except OSError as exc:
            print(f"\n[✗] 파일 저장 실패 ({path.name}): {exc}")
            return False
