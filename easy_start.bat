@echo off
title Eco-Pediatrics Easy Start

echo ====================================================
echo        🏥 Eco-Pediatrics One-Click Start
echo ====================================================

echo.
echo [1/4] Installing Backend Dependencies...
cd backend
pip install -r requirements.txt > nul 2>&1
if %errorlevel% neq 0 (
    echo Failed to install dependencies. Check if Python is installed and added to PATH.
    echo Error details:
    pip install -r requirements.txt
    pause
    exit /b
)
echo Done.

echo.
echo [2/4] Seeding Database ^& Generating Token...
python seed_data.py
if %errorlevel% neq 0 (
    echo Failed to seed data. Check if .env is correctly configured.
    echo Error details:
    python seed_data.py
    pause
    exit /b
)

echo.
echo [3/4] Starting Backend Server...
start "PID Backend" cmd /k "uvicorn main:app --reload"

echo.
echo [4/4] Starting Frontend Server...
cd ..\frontend
start "PID Frontend" cmd /k "npm run dev & echo ---------------- & echo Frontend URL: http://localhost:3000 & echo ----------------"

echo.
echo ====================================================
echo  ✅ All systems go!
echo  Check the [Dashboard URL] printed above in the Seeding step (Step 2).
echo ====================================================
pause
