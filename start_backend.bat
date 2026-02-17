@echo off
setlocal
title PID Backend
cd /d "%~dp0"

echo ====================================================
echo   Eco-Pediatrics Backend (no seed)
echo ====================================================
echo:

cd backend

:: Check if .venv exists
if exist ".venv" goto :ACTIVATE
echo [INFO] Creating virtual environment with Python 3.14...
py -3.14 -m venv .venv
if errorlevel 1 goto :FAIL_VENV

:ACTIVATE
echo [INFO] Activating virtual environment...
call ".venv\Scripts\activate.bat"

echo [INFO] Installing/Updating dependencies...
pip install -r requirements.txt -q
if errorlevel 1 goto :FAIL_DEPS

echo:
echo [SUCCESS] Starting uvicorn on http://localhost:8000
echo [INFO] (Test data: run seed_data.bat or POST /api/v1/seed/station-admissions)
echo:
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
if errorlevel 1 goto :FAIL
goto :END

:FAIL_VENV
echo [ERROR] Failed to create venv. Ensure Python 3.14 is installed.
pause
exit /b 1

:FAIL_DEPS
echo [ERROR] Failed to install dependencies.
pause
exit /b 1

:FAIL
echo [ERROR] Backend failed to start.
pause
exit /b 1

:END
pause
