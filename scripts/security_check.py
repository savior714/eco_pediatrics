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

def print_status(check_name, status, message=""):
    symbol = "[OK]" if status else "[FAIL]"
    print(f"{symbol:<6} {check_name:<30} {message}", flush=True)

def check_git_leaks():
    print("\n[1] Checking for Git Leaks (Sensitive Files)...", flush=True)
    try:
        # Get list of tracked files
        tracked_files = subprocess.check_output(["git", "ls-files"], text=True, cwd=PROJECT_ROOT).splitlines()
        leaked = []
        for file in tracked_files:
            for pattern in SENSITIVE_FILES:
                if pattern.startswith("*"):
                    if file.endswith(pattern[1:]):
                        leaked.append(file)
                elif file.endswith(pattern): # Exact match or endswith for simple patterns
                     if os.path.basename(file) == pattern:
                        leaked.append(file)

        if leaked:
            print_status("Git Leak Check", False, f"Found sensitive files in git: {', '.join(leaked)}")
            return False
        else:
            print_status("Git Leak Check", True, "No sensitive files found in git.")
            return True
    except subprocess.CalledProcessError:
        print_status("Git Leak Check", False, "Failed to run git ls-files. Is this a git repo?")
        return False
    except FileNotFoundError:
        print_status("Git Leak Check", False, "Git not found in PATH.")
        return False

def check_debug_code():
    print("\n[2] Checking for Leftover Debug Code...", flush=True)
    found_issues = []
    
    # Manual iteration to debug hang
    queue = [PROJECT_ROOT]
    
    while queue:
        current_dir = queue.pop(0)
        
        try:
            # Skip valid ignore dirs
            if current_dir.name in IGNORE_DIRS:
                continue

            for item in current_dir.iterdir():
                if item.is_dir():
                    if item.name not in IGNORE_DIRS:
                        queue.append(item)
                elif item.is_file():
                    # FILTER: Skip sensitive files and backend utility scripts
                    if item.name in SENSITIVE_FILES or \
                       any(item.name.endswith(ext) for ext in IGNORE_EXTENSIONS) or \
                       item.name.startswith(("check_", "apply_", "cleanup_", "setup_", "debug_")):
                        continue
                        
                    try:
                        content = item.read_text(encoding="utf-8")
                        for pattern, desc in DEBUG_PATTERNS:
                            if re.search(pattern, content):
                                if item.name == "security_check.py" or item.name == "error_monitor.py": continue
                                found_issues.append(f"{item.relative_to(PROJECT_ROOT)}: Contains {desc}")
                    except UnicodeDecodeError:
                        pass
                    except Exception as e:
                        print(f"[WARN] Error referencing {item}: {e}", flush=True)
                        
        except PermissionError:
            print(f"[SKIP] Permission denied: {current_dir}", flush=True)
        except Exception as e:
            print(f"[ERR] Error traversing {current_dir}: {e}", flush=True)

    if found_issues:
        print_status("Debug Code Check", False, f"Found {len(found_issues)} files with debug code.")
        for issue in found_issues[:5]: # Show first 5
            print(f"      - {issue}")
        if len(found_issues) > 5:
            print(f"      - ... and {len(found_issues) - 5} more.")
        return False # Warning only? For now strict fail.
    else:
        print_status("Debug Code Check", True, "Clean.")
        return True

def check_rls_policies():
    print("\n[3] Checking Supabase RLS (Mock/Placeholder)...", flush=True)
    # Real implementation needs postgres connection. 
    # For now, we check if we have a migration file that enables RLS.
    
    # 1. Check if 'supabase/migrations' exists
    migrations_dir = PROJECT_ROOT / "supabase" / "migrations"
    has_rls_keyword = False
    
    if migrations_dir.exists():
        for file in migrations_dir.glob("*.sql"):
            content = file.read_text(encoding="utf-8", errors="ignore")
            if "enable row level security" in content.lower():
                has_rls_keyword = True
                break
    
    if has_rls_keyword:
        print_status("RLS Policy Check", True, "Found 'enable row level security' in migrations.")
        return True
    else:
        print_status("RLS Policy Check", False, "No 'enable row level security' found in migrations. Verify manually.")
        # This is a soft check, so we might return True with warning, but let's be strict for Safety.
        return False

def main():
    print(f"[START] Security Audit for: {PROJECT_ROOT}", flush=True)
    
    results = [
        check_git_leaks(),
        check_debug_code(),
        check_rls_policies()
    ]
    
    print("\n" + "="*50)
    if all(results):
        print("[SUCCESS] Security Scan Passed. Ready for manual review.")
        sys.exit(0)
    else:
        print("[FAIL] Security Scan Failed. Please fix issues before deployment.")
        sys.exit(1)

if __name__ == "__main__":
    main()
