param([string]$Root)
$backendDir = "$Root\backend"
$frontendDir = "$Root\frontend"

# [Architect Note] 쉘 파이프라인(|)을 제거하여 파싱 안정성 100% 확보
$psExe = "pwsh.exe"
# 내부 인코딩 명령에서도 파이프라인 제거하여 Tauri 서버 감지 지연 방지
$psRawCmd = "npm run tauri dev"
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
