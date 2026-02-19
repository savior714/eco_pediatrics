@echo off
title Eco-Pediatrics Full Stack Dev
cd /d "%~dp0"

echo [WT] Launching Windows Terminal with Split Panes...
echo [INFO] Left: Backend (8000), Right: Frontend (Tauri)
echo:

:: Launch Windows Terminal with side-by-side panes
:: -d . starts in current directory
:: split-pane -d . splits the terminal
wt -M -d . --title "Backend" pwsh -NoExit -Command ".\start_backend.bat" ; ^
split-pane -H -d . --title "ErrorMonitor" --size 0.2 pwsh -NoExit -Command "backend\.venv\Scripts\python error_monitor.py --clear" ; ^
move-focus up ; ^
split-pane -V -d . --title "Frontend" pwsh -NoExit -Command ".\start_frontend.bat"

echo ====================================================
echo   Terminal session started.
echo   - Backend: http://localhost:8000
echo   - Frontend: http://localhost:3000
echo ====================================================
