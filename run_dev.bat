@echo off
title Eco-Pediatrics Full Stack Dev
cd /d "%~dp0"

echo [1/2] Starting Backend...
start "PID Backend" cmd /c "start_backend.bat"

echo [2/2] Starting Frontend (Tauri)...
start "PID Frontend" cmd /c "start_frontend.bat"

echo:
echo ====================================================
echo   All services are starting in separate windows.
echo   - Backend: http://localhost:8000
echo   - Frontend: http://localhost:3000
echo   - Desktop App: Starting via Tauri...
echo ====================================================
