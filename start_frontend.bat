@echo off
setlocal
title PID Frontend
cd /d "%~dp0"

echo ====================================================
echo   Eco-Pediatrics Frontend
echo ====================================================
echo:

cd frontend

if exist node_modules goto :UPDATE_DEPS
goto :FIRST_INSTALL

:FIRST_INSTALL
echo [INFO] Installing dependencies (first time)...
call npm install
if errorlevel 1 goto :FAIL
goto :START_DEV

:UPDATE_DEPS
echo [INFO] Updating dependencies via npm install...
call npm install
if errorlevel 1 goto :FAIL
goto :START_DEV

:START_DEV
echo:
echo [SUCCESS] Starting frontend (Next.js dev)...
echo [INFO] Backend should be at http://localhost:8000
echo:
call npm run dev
if errorlevel 1 goto :FAIL
goto :END

:FAIL
echo [ERROR] Application failed to start or install.
pause
exit /b 1

:END
pause
