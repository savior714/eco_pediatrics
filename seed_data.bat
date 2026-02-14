@echo off
title PID Seed Data (optional)
cd /d "%~dp0"

echo ====================================================
echo   Create test / dummy data (run when you need it)
echo ====================================================
echo.

cd backend
if not exist ".venv" (
    echo Backend venv not found. Run start_backend.bat once first.
    pause
    exit /b 1
)
call .venv\Scripts\activate.bat

echo Running seed_data.py (dummy patient + vitals)...
python seed_data.py
set SEED_EXIT=%errorlevel%
cd /d "%~dp0"
echo.
if %SEED_EXIT% neq 0 (
    echo Seed failed. Check backend/.env and Supabase.
    pause
    exit /b 1
)
echo Done. Dashboard URL is printed above.
echo For 30-bed station data: POST http://localhost:8000/api/v1/seed/station-admissions
pause
