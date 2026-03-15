import os
import sys
import subprocess
import re
from pathlib import Path

# --- Configuration ---
PROJECT_ROOT = Path(__file__).parent.parent.absolute()
SENSITIVE_FILES = [".env", ".env.local", "service-account.json", "*.pem", "*.key"]
DEBUG_PATTERNS = [
    (r"print\(", "Python print()"),
    (r"console\.log\(", "JS/TS console.log()"),
    (r"debugger", "JS debugger"),
]
IGNORE_DIRS = [".git", ".venv", "__pycache__", "node_modules", ".next", ".mypy_cache", "scripts", "tests", ".skills", ".pytest_cache", "target"]
IGNORE_EXTENSIONS = [".md", ".json", ".txt", ".log", ".bat", ".css", ".svg", ".ico"]

def print_status(check_name: str, status: bool, message: str = "") -> None:
    """체크 결과를 [OK] / [FAIL] 기호와 함께 표준 출력으로 보고한다."""
    symbol = "[OK]" if status else "[FAIL]"
    print(f"{symbol:<6} {check_name:<30} {message}", flush=True)


def _scan_file_for_debug(item: Path) -> list[str]:
    """단일 파일에서 디버그 코드 패턴을 검색하고, 발견된 이슈 문자열 목록을 반환한다.

    스캔 제외 조건(Early Return):
    - SENSITIVE_FILES·IGNORE_EXTENSIONS에 해당하는 파일
    - 특정 접두사(check_, apply_ 등)로 시작하는 유틸리티 스크립트
    - 본 스크립트 자신 및 error_monitor.py
    """
    if item.name in SENSITIVE_FILES:
        return []
    if any(item.name.endswith(ext) for ext in IGNORE_EXTENSIONS):
        return []
    if item.name.startswith(("check_", "apply_", "cleanup_", "setup_", "debug_")):
        return []
    if item.name in ("security_check.py", "error_monitor.py"):
        return []

    try:
        content = item.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return []
    except Exception as e:
        print(f"[WARN] Error reading {item}: {e}", flush=True)
        return []

    return [
        f"{item.relative_to(PROJECT_ROOT)}: Contains {desc}"
        for pattern, desc in DEBUG_PATTERNS
        if re.search(pattern, content)
    ]


def check_git_leaks() -> bool:
    """Git으로 추적 중인 파일 목록에서 민감 정보 파일(.env, *.pem 등) 포함 여부를 검사한다."""
    print("\n[1] Checking for Git Leaks (Sensitive Files)...", flush=True)
    try:
        tracked_files = subprocess.check_output(
            ["git", "ls-files"], text=True, cwd=PROJECT_ROOT
        ).splitlines()
        leaked = [
            f
            for f in tracked_files
            for pattern in SENSITIVE_FILES
            if (pattern.startswith("*") and f.endswith(pattern[1:]))
            or (not pattern.startswith("*") and os.path.basename(f) == pattern)
        ]
        if leaked:
            print_status("Git Leak Check", False, f"Found sensitive files in git: {', '.join(leaked)}")
            return False
        print_status("Git Leak Check", True, "No sensitive files found in git.")
        return True
    except subprocess.CalledProcessError:
        print_status("Git Leak Check", False, "Failed to run git ls-files. Is this a git repo?")
        return False
    except FileNotFoundError:
        print_status("Git Leak Check", False, "Git not found in PATH.")
        return False


def check_debug_code() -> bool:
    """프로젝트 소스 전체를 순회하여 잔여 디버그 코드(print, console.log 등)를 검출한다.

    파일별 세부 스캔 로직은 `_scan_file_for_debug`로 위임하여 중첩 깊이를 2단계로 유지한다.
    """
    print("\n[2] Checking for Leftover Debug Code...", flush=True)
    found_issues: list[str] = []
    queue = [PROJECT_ROOT]

    while queue:
        current_dir = queue.pop(0)
        if current_dir.name in IGNORE_DIRS:
            continue
        try:
            for item in current_dir.iterdir():
                if item.is_dir() and item.name not in IGNORE_DIRS:
                    queue.append(item)
                elif item.is_file():
                    found_issues.extend(_scan_file_for_debug(item))
        except PermissionError:
            print(f"[SKIP] Permission denied: {current_dir}", flush=True)
        except Exception as e:
            print(f"[ERR] Error traversing {current_dir}: {e}", flush=True)

    if found_issues:
        print_status("Debug Code Check", False, f"Found {len(found_issues)} files with debug code.")
        for issue in found_issues[:5]:
            print(f"      - {issue}")
        if len(found_issues) > 5:
            print(f"      - ... and {len(found_issues) - 5} more.")
        return False
    print_status("Debug Code Check", True, "Clean.")
    return True


def check_rls_policies() -> bool:
    """Supabase 마이그레이션 파일에서 Row Level Security 활성화 키워드를 탐색한다.

    실제 DB 연결 없이 마이그레이션 SQL 파일 내 'enable row level security' 존재 여부로 판단한다.
    """
    print("\n[3] Checking Supabase RLS (Mock/Placeholder)...", flush=True)
    migrations_dir = PROJECT_ROOT / "supabase" / "migrations"
    if not migrations_dir.exists():
        print_status("RLS Policy Check", False, "No 'enable row level security' found in migrations. Verify manually.")
        return False

    for file in migrations_dir.glob("*.sql"):
        content = file.read_text(encoding="utf-8", errors="ignore")
        if "enable row level security" in content.lower():
            print_status("RLS Policy Check", True, "Found 'enable row level security' in migrations.")
            return True

    print_status("RLS Policy Check", False, "No 'enable row level security' found in migrations. Verify manually.")
    return False


def main() -> None:
    """보안 감사 진입점. 전체 체크 결과를 집계하고 최종 성공/실패 코드로 종료한다."""
    print(f"[START] Security Audit for: {PROJECT_ROOT}", flush=True)

    results = [
        check_git_leaks(),
        check_debug_code(),
        check_rls_policies(),
    ]

    print("\n" + "=" * 50)
    if all(results):
        print("[SUCCESS] Security Scan Passed. Ready for manual review.")
        sys.exit(0)
    else:
        print("[FAIL] Security Scan Failed. Please fix issues before deployment.")
        sys.exit(1)

if __name__ == "__main__":
    main()
