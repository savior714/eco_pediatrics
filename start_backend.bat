@echo off
title PID Backend
cd /d "%~dp0"

echo ====================================================
echo   Eco-Pediatrics Backend (no seed)
echo ====================================================
echo.

cd backend
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo Failed to create venv. Use Python 3.11 or 3.12 64-bit.
        pause
        exit /b 1
    )
)
call .venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt -q
if %errorlevel% neq 0 (
    echo Failed to install. Run: pip install -r requirements.txt
    pause
    exit /b 1
)

echo.
echo Starting backend on http://localhost:8000
echo (Test data: run seed_data.bat when needed, or POST /api/v1/seed/station-admissions)
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
