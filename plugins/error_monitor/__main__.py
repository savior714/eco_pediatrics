import argparse
import sys
from .definition import WATCH_TARGETS, OUTPUT_FILE
from .logic import ErrorMonitorService

def ensure_log_directories() -> None:
    for _label, log_path in WATCH_TARGETS.items():
        log_path.parent.mkdir(parents=True, exist_ok=True)

def main() -> None:
    ensure_log_directories()
    parser = argparse.ArgumentParser(description="eco_pediatrics Error Monitor (Plugin)")
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

    service = ErrorMonitorService()
    try:
        service.run(clear_at_start=args.clear)
    except KeyboardInterrupt:
        print("\n[*] 모니터 종료.")

if __name__ == "__main__":
    main()
