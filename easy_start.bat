@echo off
title Eco-Pediatrics Easy Start

REM Always run from the folder where this batch file lives
cd /d "%~dp0"

echo ====================================================
echo        Eco-Pediatrics One-Click Start
echo ====================================================
echo(

echo [1/5] Preparing Backend (venv + dependencies)...
cd backend
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo Failed to create venv. Use Python 3.11 or 3.12 64-bit. See TROUBLESHOOTING.md
        pause
        exit /b 1
    )
)
call .venv\Scripts\activate.bat
pip install -r requirements.txt > nul 2>&1
if %errorlevel% neq 0 (
    echo Failed to install dependencies. Check if Python is installed and added to PATH.
    echo Error details:
    pip install -r requirements.txt
    pause
    exit /b 1
)
echo Done.
echo(

echo [2/5] Seeding Database and Generating Token...
python seed_data.py
if %errorlevel% neq 0 (
    echo Failed to seed data. Check if .env is correctly configured.
    echo Error details:
    python seed_data.py
    pause
    exit /b 1
)
echo(

echo [3/5] Starting Backend Server...
set "BACKEND_DIR=%~dp0backend"
start "PID Backend" cmd /k "cd /d "%BACKEND_DIR%" && call .venv\Scripts\activate.bat && uvicorn main:app --reload"
cd /d "%~dp0"
echo(

echo [4/5] Installing Frontend Dependencies...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo Failed to install frontend dependencies. Check if Node.js is installed.
        pause
        exit /b 1
    )
) else (
    call npm install > nul 2>&1
)
echo Done.
echo(

echo [5/5] Starting Frontend Server...
set "FRONTEND_DIR=%~dp0frontend"
start "PID Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"
echo(

echo ====================================================
echo  All systems go!
echo  Check the [Dashboard URL] printed above in the Seeding step (Step 2).
echo ====================================================
pause
