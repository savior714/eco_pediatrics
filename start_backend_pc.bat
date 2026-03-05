@chcp 65001 > nul
@echo off
REM PC-only fast launcher: Optimized for local development. save as UTF-8 (no BOM).
setlocal
title Eco-Pediatrics Backend (uv)

:: Jump logic: Restart in a new window if not already in one
if not "%~1"=="__INTERNAL__" (
    start "Eco-Backend" cmd /k ""%~f0" __INTERNAL__"
    exit /b 0
)

echo ====================================================
echo   Eco-Pediatrics Backend (UV Native)
echo ====================================================

cd /d "%~dp0backend"

if not exist ".venv" (
    echo [ECO] Creating virtual environment...
    uv venv .venv --python 3.14
    if errorlevel 1 (
        echo [ERROR] Failed to create venv.
        pause
        exit /b 1
    )
)

echo [ECO] Syncing dependencies...
uv pip install -r requirements.txt -q
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo [ECO] Starting backend on http://localhost:8000
echo.
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
exit /b 0
