# scripts\launch_wt_dev.ps1
# Layout: [Top 20%: Error Monitor] / [Bottom-left: Backend] / [Bottom-right: Frontend]
# move-focus down before -V ensures the vertical split targets the bottom pane (deterministic).
param([string]$Root)

$backendDir = "$Root\backend"
$frontendDir = "$Root\frontend"

# wt argument array: ";" as separate element so PowerShell does not treat it as command separator
$wtArgs = @(
  "--maximized",
  # 1. Pane 0: Error Monitor (full pane; error_monitor.py is in project root)
  "-w", "0", "nt", "--title", "Eco-Dev-Stack", "-d", $Root,
  "cmd", "/c", "python error_monitor.py --clear",
  # 2. Split horizontal: bottom 80% = Backend (Pane 1)
  ";", "split-pane", "-H", "--size", "0.8", "-d", $backendDir,
  "cmd", "/k", "call .venv\Scripts\activate.bat && python -m uvicorn main:app --reload --port 8000",
  # 3. Force focus to bottom pane so next split targets it
  ";", "move-focus", "down",
  # 4. Split vertical: current (bottom) pane 50% = Frontend
  ";", "split-pane", "-V", "--size", "0.5", "-d", $frontendDir,
  "cmd", "/k", "npm run tauri dev"
)

Start-Process "wt" -ArgumentList $wtArgs
