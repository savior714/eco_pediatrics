param([string]$Root)
$backendDir = "$Root\backend"
$frontendDir = "$Root\frontend"

# [Architect Note] Frontend stdout/stderr를 로그 파일로 남겨 Error Monitor가 감시할 수 있게 함
$psExe = "pwsh.exe"
# Tee-Object: 터미널 출력과 동시에 frontend/logs/frontend.log 기록 (PowerShell 기본 UTF-16, error_monitor는 _tail에서 처리)
$psRawCmd = "npm run tauri dev 2>&1 | Tee-Object -FilePath logs\frontend.log"
$encodedCmd = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($psRawCmd))
$feCmd = "$psExe -NoExit -EncodedCommand $encodedCmd"

# 각 커맨드를 단순 문자열로 정의 (중첩 따옴표 최소화)
$monCmd = "cmd /k `"backend\.venv\Scripts\python.exe error_monitor.py --clear`""
$beCmd = "cmd /k `"call .venv\Scripts\activate.bat && python -m uvicorn main:app --reload --port 8000`""

# [Critical Fix] 세미콜론(;)을 기준으로 명확히 분리하고 실행 커맨드 전체를 묶는 따옴표 제거
$argStr = "--maximized -w 0 nt --title `"Eco-Dev-Stack`" -d `"$Root`" $monCmd ; " +
"split-pane -H --size 0.8 -d `"$backendDir`" $beCmd ; " +
"move-focus down ; " +
"split-pane -V --size 0.5 -d `"$frontendDir`" $feCmd"

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "wt.exe"
$psi.Arguments = $argStr
$psi.UseShellExecute = $true
[System.Diagnostics.Process]::Start($psi) | Out-Null
