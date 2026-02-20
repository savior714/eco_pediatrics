@echo off
setlocal enabledelayedexpansion
title Eco-Pediatrics Launcher

:: 1. CLI Mode: If arguments exist, jump directly
if not "%1"=="" (
    if "%1"=="dev" goto dev
    if "%1"=="setup" goto setup
    if "%1"=="check" goto check
    if "%1"=="backend" goto backend
    if "%1"=="frontend" goto frontend
    goto help_cli
)

:menu
cls
echo ==========================================
echo         ECO-PEDIATRICS LAUNCHER
echo ==========================================
echo.
echo   [1] Start Dev Mode (Backend + Frontend)
echo   [2] Environment Setup (Install Deps)
echo   [3] Run Security & Health Check
echo.
echo   [Q] Quit
echo.
echo ==========================================
set /p choice="Select an option (1-3, Q): "

if "%choice%"=="1" goto dev
if "%choice%"=="2" goto setup
if "%choice%"=="3" goto check
if /i "%choice%"=="q" goto end
if /i "%choice%"=="Q" goto end
goto menu

:dev
echo.
echo [ECO] Starting Development Environment...
start "Eco-Pediatrics Backend" cmd /k "cd backend & .venv\Scripts\activate & python -m uvicorn main:app --reload --port 8000"
start "Eco-Pediatrics Frontend" cmd /k "cd frontend & npm run dev"
echo [ECO] Services started in separate windows.
timeout /t 3 >nul
goto end

:backend
echo.
echo [ECO] Starting Backend Only...
cd backend
.venv\Scripts\activate
python -m uvicorn main:app --reload --port 8000
goto end

:frontend
echo.
echo [ECO] Starting Frontend Only...
cd frontend
npm run dev
goto end

:setup
echo.
echo [ECO] Running Setup...
:: 1. Check Prerequisites
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.14.x.
    pause
    goto menu
)
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js v24.12.x.
    pause
    goto menu
)

:: 2. Backend Setup
echo.
echo [1/4] Setting up Backend...
cd backend
if not exist ".venv" (
    echo    - Creating virtual environment...
    py -3.14 -m venv .venv
)
echo    - Upgrading pip & installing dependencies...
call .venv\Scripts\activate
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
if not exist ".env" (
    echo    - Creating .env from template...
    copy .env.example .env >nul
)
deactivate
cd ..

:: 3. Frontend Setup
echo.
echo [2/4] Setting up Frontend...
cd frontend
echo    - Installing npm packages...
call npm install
if not exist ".env.local" (
    echo    - Creating .env.local from template...
    copy .env.example .env.local >nul
)
cd ..

:: 4. Verification
echo.
echo [3/4] Running Environment Doctor...
python scripts/doctor.py

echo.
echo [ECO] Setup Complete. Press any key to return to menu...
pause >nul
goto menu


:check
echo.
echo [ECO] Running Security and Health Check...
echo ------------------------------------------
python scripts/doctor.py
if %errorlevel% neq 0 (
    echo [WARN] Environment check failed.
)
echo.
echo [ECO] Security Audit...
python scripts/security_check.py

echo.
echo [ECO] Check Complete. Press any key to return to menu...
pause >nul
goto menu

:help_cli
echo.
echo  Usage: eco [command]
echo.
echo  Commands:
echo    dev      Start both Backend and Frontend servers
echo    setup    Install dependencies and setup environment
echo    check    Run Environment Doctor & Security Audit
echo.
goto end

:end
endlocal
