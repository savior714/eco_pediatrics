# scripts\launch_wt_dev.ps1
# Layout: [Top 20%: Error Monitor] / [Bottom-left: Backend] / [Bottom-right: Frontend]
# move-focus down before -V ensures the vertical split targets the bottom pane (deterministic).
# Error Monitor: backend venv Python. Frontend: Tee-Object to frontend/logs/frontend.log for monitor.
param([string]$Root)

$backendDir = "$Root\backend"
$frontendDir = "$Root\frontend"

# Ensure frontend log directory exists so Tee-Object can write
$frontendLogDir = "$frontendDir\logs"
if (-not (Test-Path $frontendLogDir)) { New-Item -ItemType Directory -Path $frontendLogDir -Force | Out-Null }

# Frontend: tee to logs\frontend.log. Use full path to PowerShell so cmd finds it without PATH.
$psExe = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$frontendCmd = "`"$psExe`" -NoExit -Command `"npm run tauri dev 2>&1 | Tee-Object -FilePath 'logs\frontend.log' -Append`""

# wt argument array: ";" as separate element so PowerShell does not treat it as command separator
$wtArgs = @(
  "--maximized",
  # 1. Pane 0: Error Monitor (project root; use backend venv Python)
  "-w", "0", "nt", "--title", "Eco-Dev-Stack", "-d", $Root,
  "cmd", "/k", "backend\.venv\Scripts\python.exe error_monitor.py --clear",
  # 2. Split horizontal: bottom 80% = Backend (Pane 1)
  ";", "split-pane", "-H", "--size", "0.8", "-d", $backendDir,
  "cmd", "/k", "call .venv\Scripts\activate.bat && python -m uvicorn main:app --reload --port 8000",
  # 3. Force focus to bottom pane so next split targets it
  ";", "move-focus", "down",
  # 4. Split vertical: current (bottom) pane 50% = Frontend (with log tee)
  ";", "split-pane", "-V", "--size", "0.5", "-d", $frontendDir,
  "cmd", "/k", $frontendCmd
)

Start-Process "wt" -ArgumentList $wtArgs
