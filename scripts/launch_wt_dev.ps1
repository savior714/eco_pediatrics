# scripts\launch_wt_dev.ps1
# One tab, three panes: Error Monitor (top 20%) | Backend (bottom-left) | Frontend (bottom-right).
# Semicolon passed as literal wt argument via array to avoid PowerShell parsing.
param([string]$Root)

$backendDir = Join-Path $Root "backend"
$frontendDir = Join-Path $Root "frontend"

# wt argument array: ";" is one element so wt receives it, not PowerShell
$wtArgs = @(
  "-w", "0", "nt", "--title", "Eco-Dev-Stack", "-d", $Root,
  "cmd", "/c", "python error_monitor.py --clear",
  ";",
  "split-pane", "-H", "--size", "0.8", "-d", $backendDir,
  "cmd", "/k", "call .venv\Scripts\activate.bat && python -m uvicorn main:app --reload --port 8000",
  ";",
  "split-pane", "-V", "--size", "0.5", "-d", $frontendDir,
  "cmd", "/k", "npm run dev"
)

Start-Process "wt" -ArgumentList $wtArgs
