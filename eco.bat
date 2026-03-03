@echo off
REM If window closes at once: save as ANSI(CP949). See docs\TROUBLESHOOTING.md section 8.
chcp 65001 >nul
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

:: [Fix] User rules에 따라 pwsh.exe 사용. 경로 공백 대응을 위해 쿼팅 유지.
pwsh.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch_wt_dev.ps1" -Root "%ROOT%"
exit

:backend
echo.
echo [ECO] Starting Backend (uv)...
cd backend
uv run uvicorn main:app --reload --port 8000
goto end

:frontend
echo.
echo [ECO] Starting Frontend...
cd frontend
npm run dev
goto end

:setup
echo.
echo [ECO] Running Setup (PowerShell)...
set "SETUP_ROOT=%~dp0"
if "%SETUP_ROOT:~-1%"=="\" set "SETUP_ROOT=%SETUP_ROOT:~0,-1%"
pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Setup-Environment.ps1" -ProjectRoot "%SETUP_ROOT%"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ECO] Setup FAILED. See errors above. Log: %~dp0logs\eco_setup.log
    echo.
    pause
    goto menu
)
echo.
echo [ECO] Setup Complete. Press any key to return to menu...
pause
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
echo    check    Run Environment Doctor ^& Security Audit
echo.
goto end

:end
echo.
pause
endlocal
