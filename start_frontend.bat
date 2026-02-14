@echo off
title PID Frontend
cd /d "%~dp0"

echo ====================================================
echo   Eco-Pediatrics Frontend
echo ====================================================
echo.

cd frontend
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Failed to install. Check Node.js.
        pause
        exit /b 1
    )
) else (
    call npm install
)
echo.
echo Starting frontend (Next.js dev)...
echo Backend should be at http://localhost:8000
echo.
call npm run dev
pause
