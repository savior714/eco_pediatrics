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

PROJECT_ROOT = Path(__file__).parent.parent.absolute()

def print_status(check_name, status, message=""):
    symbol = "[OK]" if status else "[FAIL]"
    print(f"{symbol:<6} {check_name:<30} {message}")

def check_python():
    current_ver = sys.version_info[:2]
    is_valid = current_ver == REQUIRED_PYTHON_VERSION
    msg = f"Found {sys.version.split()[0]}"
    if not is_valid:
        msg += f" (Required: {REQUIRED_PYTHON_VERSION[0]}.{REQUIRED_PYTHON_VERSION[1]}.x)"
    print_status("Python Version", is_valid, msg)
    return is_valid

def check_node():
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

def check_git():
    try:
        output = subprocess.check_output(["git", "--version"], text=True).strip()
        # Loose check for git availability
        print_status("Git Installation", True, output)
        return True
    except FileNotFoundError:
        print_status("Git Installation", False, "Git not found in PATH")
        return False

def check_msvc():
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


def check_cargo():
    """Rust/cargo required for Tauri desktop app (npm run tauri dev)."""
    cargo_path = shutil.which(REQUIRED_CARGO_CMD)
    if cargo_path:
        try:
            output = subprocess.check_output(
                [REQUIRED_CARGO_CMD, "--version"], text=True
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


def check_project_structure():
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
        print_status("Backend .env", False, "Missing (Run setup_env.bat)")
        all_good = False
        
    frontend_env = PROJECT_ROOT / "frontend" / ".env.local"
    if frontend_env.exists():
        print_status("Frontend .env.local", True, "Exists")
    else:
        print_status("Frontend .env.local", False, "Missing (Run setup_env.bat)")
        all_good = False

    return all_good

def main():
    print(f"[START] Running Eco-Pediatrics Environment Doctor...\nTarget: {PROJECT_ROOT}\n")
    
    results = [
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
