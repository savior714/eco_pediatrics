import sys
import os
import re
import subprocess
import shutil
from pathlib import Path

# --- Configuration (SSOT: docs/DEV_ENVIRONMENT.md) ---
REQUIRED_PYTHON_VERSION = (3, 14)
REQUIRED_NODE_MAJOR = 24
REQUIRED_NODE_MINOR_MIN = 12
REQUIRED_GIT_VERSION_MIN = "2.52"  # Loose check
REQUIRED_MSVC_CHECK_CMD = "cl"
REQUIRED_CARGO_CMD = "cargo"  # Tauri desktop app
REQUIRED_UV_CMD = "uv"

PROJECT_ROOT = Path(__file__).parent.parent.absolute()

def print_status(check_name: str, status: bool, message: str = "") -> None:
    """체크 결과를 [OK] / [FAIL] 기호와 함께 표준 출력으로 보고한다."""
    symbol = "[OK]" if status else "[FAIL]"
    print(f"{symbol:<6} {check_name:<30} {message}")


def check_python() -> bool:
    """현재 Python 인터프리터 버전이 프로젝트 요구 버전과 일치하는지 검증한다."""
    current_ver = sys.version_info[:2]
    is_valid = current_ver == REQUIRED_PYTHON_VERSION
    msg = f"Found {sys.version.split()[0]}"
    if not is_valid:
        msg += f" (Required: {REQUIRED_PYTHON_VERSION[0]}.{REQUIRED_PYTHON_VERSION[1]}.x)"
    print_status("Python Version", is_valid, msg)
    return is_valid

def check_node() -> bool:
    """Node.js 설치 여부 및 프로젝트 요구 Major·Minor 버전을 검증한다."""
    try:
        output = subprocess.check_output(["node", "-v"], text=True).strip()
        match = re.search(r"v(\d+)\.(\d+)", output)
        if match:
            major, minor = map(int, match.groups())
            is_valid = (major == REQUIRED_NODE_MAJOR) and (minor >= REQUIRED_NODE_MINOR_MIN)
            msg = f"Found {output}"
            if not is_valid:
                msg += f" (Required: v{REQUIRED_NODE_MAJOR}.{REQUIRED_NODE_MINOR_MIN}.x or higher)"
            print_status("Node.js Version", is_valid, msg)
            return is_valid
        print_status("Node.js Version", False, f"Unparseable version: {output}")
        return False
    except FileNotFoundError:
        print_status("Node.js Version", False, "Node.js not found in PATH")
        return False

def check_git() -> bool:
    """Git 실행 파일이 PATH에 존재하는지 확인한다."""
    try:
        output = subprocess.check_output(["git", "--version"], text=True).strip()
        # Loose check for git availability
        print_status("Git Installation", True, output)
        return True
    except FileNotFoundError:
        print_status("Git Installation", False, "Git not found in PATH")
        return False


def check_uv():
    """uv 필수: 가상환경·의존성 관리(글로벌 룰). PATH 또는 python -m uv 둘 다 허용."""
    for cmd in (["uv", "--version"], [sys.executable, "-m", "uv", "--version"]):
        try:
            output = subprocess.check_output(
                cmd, text=True, stderr=subprocess.DEVNULL
            ).strip()
            ver = output.split()[0] if output else "Found"
            print_status("uv (package manager)", True, ver)
            return True
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    print_status(
        "uv (package manager)",
        False,
        "Not found. Install: pip install uv",
    )
    return False


def check_msvc() -> bool:
    """MSVC 컴파일러(cl.exe) 또는 환경 변수 주입 여부를 확인한다. Tauri 빌드에 필수."""
    cl_path = shutil.which(REQUIRED_MSVC_CHECK_CMD)
    is_env_set = "INCLUDE" in os.environ and "ucrt" in os.environ.get("INCLUDE", "").lower()
    if cl_path or is_env_set:
        msg = "Found cl.exe" if cl_path else "Found via Environment Injection"
        print_status("MSVC Compiler", True, msg)
        return True
    print_status(
        "MSVC Compiler",
        False,
        "cl.exe not found. Install 'Desktop development with C++' in VS Installer.",
    )
    return False


def check_cargo() -> bool:
    """Rust cargo 실행 파일을 PATH 및 rustup 기본 경로에서 탐색한다. Tauri 데스크톱 앱 빌드에 필수."""
    cargo_path = shutil.which(REQUIRED_CARGO_CMD)
    if not cargo_path:
        userprofile = Path(os.environ.get("USERPROFILE", ""))
        fallbacks = [
            userprofile / ".cargo" / "bin" / "cargo.exe",
            userprofile / ".rustup" / "toolchains" / "stable-x86_64-pc-windows-msvc" / "bin" / "cargo.exe",
        ]
        for fb in fallbacks:
            if fb.exists():
                cargo_path = str(fb)
                break
    if cargo_path:
        try:
            output = subprocess.check_output(
                [cargo_path, "--version"], text=True
            ).strip()
            print_status("Rust (cargo)", True, output)
            return True
        except subprocess.CalledProcessError:
            pass
    print_status(
        "Rust (cargo)",
        False,
        "cargo not found. Install from https://rustup.rs/ (Tauri desktop app needs it).",
    )
    return False


def check_project_structure() -> bool:
    """프로젝트 필수 디렉터리·파일(.venv, node_modules, .env 등) 존재 여부를 일괄 검증한다."""
    all_good = True
    
    # Backend
    venv_path = PROJECT_ROOT / "backend" / ".venv"
    if venv_path.exists():
        print_status("Backend .venv", True, "Exists")
    else:
        print_status("Backend .venv", False, "Missing")
        all_good = False

    # Frontend
    node_modules_path = PROJECT_ROOT / "frontend" / "node_modules"
    if node_modules_path.exists():
        print_status("Frontend node_modules", True, "Exists")
    else:
        print_status("Frontend node_modules", False, "Missing")
        all_good = False
    
    # Envs
    backend_env = PROJECT_ROOT / "backend" / ".env"
    if backend_env.exists():
        print_status("Backend .env", True, "Exists")
    else:
        print_status("Backend .env", False, "Missing (Run 'eco setup')")
        all_good = False
        
    frontend_env = PROJECT_ROOT / "frontend" / ".env.local"
    if frontend_env.exists():
        print_status("Frontend .env.local", True, "Exists")
    else:
        print_status("Frontend .env.local", False, "Missing (Run 'eco setup')")
        all_good = False

    return all_good

def main() -> None:
    """환경 진단 진입점. 전체 체크 결과를 집계하고 이상 시 수정 안내 메시지를 출력한다."""
    print(f"[START] Running Eco-Pediatrics Environment Doctor...\nTarget: {PROJECT_ROOT}\n")
    
    results = [
        check_uv(),
        check_python(),
        check_node(),
        check_git(),
        check_msvc(),
        check_cargo(),
        check_project_structure(),
    ]
    
    print("\n" + "="*50)
    if all(results):
        print("[SUCCESS] Environment is HEALTHY! You are ready to develop.")
        sys.exit(0)
    else:
        print("[WARNING] Environment has ISSUES. Please fix the items marked with [FAIL].")
        print("   Tip: Run 'eco setup' to fix missing dependencies.")
        sys.exit(1)

if __name__ == "__main__":
    main()
