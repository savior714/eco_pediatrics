@echo off
:: ============================================================
:: PC-only: fixed absolute paths (not portable)
:: Python: C:\Users\neo24\AppData\Local\Programs\Python\Python314\python.exe
:: ============================================================

setlocal
title PID Backend (PC)

if not "%~1"=="__INTERNAL__" (
    start "PID Backend" cmd /k ""%~f0" __INTERNAL__"
    exit /b 0
)

set "PY_EXE=C:\Users\neo24\AppData\Local\Programs\Python\Python314\python.exe"
set "PROJECT_DIR=C:\Users\neo24\Desktop\develop\eco_pediatrics"

echo ====================================================
echo   Eco-Pediatrics Backend (PC Fixed Path)
echo ====================================================

if not exist "%PY_EXE%" (
    echo [Error] Python not found: %PY_EXE%
    pause
    exit /b 1
)

echo Selected: %PY_EXE%
echo.

if not exist "%PROJECT_DIR%\backend" (
    echo [Error] backend folder not found: %PROJECT_DIR%\backend
    pause
    exit /b 1
)

cd /d "%PROJECT_DIR%\backend"

if not exist ".venv" (
    echo Creating virtual environment...
    "%PY_EXE%" -m venv .venv
    if errorlevel 1 (
        echo Failed to create venv.
        pause
        exit /b 1
    )
)

call .venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt -q
if errorlevel 1 (
    echo Failed to install dependencies. Check requirements.txt
    pause
    exit /b 1
)

echo.
echo Starting backend on http://localhost:8000
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
exit /b 0
