"""
스캔 결과 파일 출력 유틸리티. 표준 logger 사용.
"""
import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from logger import logger

_SCAN_RESULTS = _BACKEND_DIR / "scan_results.txt"


def read_scan() -> None:
    if not _SCAN_RESULTS.exists():
        logger.warning(f"File not found: {_SCAN_RESULTS}")
        return
    content = _SCAN_RESULTS.read_text(encoding="utf-8", errors="ignore")
    logger.info(f"Scan results:\n{content}")


if __name__ == "__main__":
    try:
        read_scan()
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
