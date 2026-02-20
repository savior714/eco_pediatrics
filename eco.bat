@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
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
echo   [3] Run Security ^& Health Check
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
echo [ECO] Starting Dev Mode and Closing Launcher...
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

:: Run PowerShell in same console; script starts WT then returns, then launcher exits
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch_wt_dev.ps1" -Root "%ROOT%"
exit

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
set "SETUP_LOG=%~dp0logs\eco_setup.log"
if not exist "%~dp0logs" mkdir "%~dp0logs"
echo [%date% %time%] --- Setup started --- >> "%SETUP_LOG%"

:: 1. Check Prerequisites
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.14.x.
    echo [%date% %time%] FAIL: Python not found >> "%SETUP_LOG%"
    goto setup_fail
)
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js v24.12.x.
    echo [%date% %time%] FAIL: Node.js not found >> "%SETUP_LOG%"
    goto setup_fail
)

:: 2. Backend Setup
echo.
echo [1/4] Setting up Backend...
cd /d "%~dp0backend"
if not exist ".venv" (
    echo    - Creating virtual environment...
    call py -3.14 -m venv .venv
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create backend .venv.
        echo [%date% %time%] FAIL: py -3.14 -m venv .venv >> "%SETUP_LOG%"
        cd /d "%~dp0"
        goto setup_fail
    )
)

:: SDK auto-discovery (Windows Kits 10) for Python 3.14 / VS 2026 build
echo    - Configuring Build Environment (SDK Discovery)...
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\Include\10.*' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1).Name"') do set "SDK_VER=%%i"
if defined SDK_VER (
    set "SDK_INC=C:\Program Files (x86)\Windows Kits\10\Include\%SDK_VER%"
    set "SDK_LIB=C:\Program Files (x86)\Windows Kits\10\Lib\%SDK_VER%"
    set "SDK_BIN=C:\Program Files (x86)\Windows Kits\10\bin\%SDK_VER%\x64"
    set "INCLUDE=!SDK_INC!\ucrt;!SDK_INC!\shared;!SDK_INC!\um;!INCLUDE!"
    set "LIB=!SDK_LIB!\ucrt\x64;!SDK_LIB!\um\x64;!LIB!"
    set "PATH=!SDK_BIN!;!PATH!"
) else (
    echo    - Windows SDK not found; build may fail for native deps.
)

echo    - Upgrading pip ^& installing dependencies...
call .venv\Scripts\activate
python -m pip install --upgrade pip setuptools wheel cython
python -m pip install pyroaring pyiceberg --no-cache-dir 2>nul
call pip install -r requirements.txt
if !errorlevel! neq 0 (
    echo [ERROR] pip install -r requirements.txt failed.
    echo [%date% %time%] FAIL: pip install -r requirements.txt >> "%SETUP_LOG%"
    call deactivate
    cd /d "%~dp0"
    goto setup_fail
)
if not exist ".env" (
    echo    - Creating .env from template...
    copy .env.example .env >nul
)
call deactivate
cd /d "%~dp0"

:: 3. Frontend Setup
echo.
echo [2/4] Setting up Frontend...
cd /d "%~dp0frontend"
echo    - Installing npm packages...
call npm install
if !errorlevel! neq 0 (
    echo [ERROR] npm install failed.
    echo [%date% %time%] FAIL: npm install >> "%SETUP_LOG%"
    cd /d "%~dp0"
    goto setup_fail
)
if not exist ".env.local" (
    echo    - Creating .env.local from template...
    copy .env.example .env.local >nul
)
cd /d "%~dp0"

:: 4. Verification
echo.
echo [3/4] Running Environment Doctor...
python scripts/doctor.py
if !errorlevel! neq 0 (
    echo.
    echo [WARN] Doctor reported issues. Check above. Log: %SETUP_LOG%
    echo [%date% %time%] WARN: doctor.py reported failures >> "%SETUP_LOG%"
    echo.
    echo Press any key to return to menu...
    pause >nul
    goto menu
)

echo [%date% %time%] OK: Setup complete >> "%SETUP_LOG%"
echo.
echo [ECO] Setup Complete. Press any key to return to menu...
pause >nul
goto menu

:setup_fail
echo.
echo [ECO] Setup FAILED. See errors above. Log: %SETUP_LOG%
echo.
echo Press any key to return to menu...
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
echo.
pause
endlocal
