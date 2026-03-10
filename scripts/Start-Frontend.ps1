# [Architect Note] 프런트엔드 기동 유틸리티 (PSScriptRoot Self-Location 패턴)
# wt.exe는 새 창을 독립 프로세스로 열기 때문에 부모의 환경 변수가 상속되지 않음.
# $PSScriptRoot (항상 스크립트 자신의 위치)를 기준으로 경로를 자체 계산하여 이 문제를 근본 해결.
$projectRoot = Split-Path $PSScriptRoot -Parent
$targetDir = Join-Path $projectRoot "frontend"
$logsDir = Join-Path $projectRoot "logs"

if (!(Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }
$logPath = Join-Path $logsDir "frontend.log"

Set-Location -Path $targetDir
Write-Host "[ECO] Frontend running in: $((Get-Location).Path)" -ForegroundColor Green
Write-Host "[ECO] Logging to: $logPath" -ForegroundColor Gray

# wt.exe는 독립 프로세스로 열려 사용자 PATH가 누락됨 - cargo/rustup 경로 명시 주입
$userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
if ($userPath -and $env:PATH -notlike "*$userPath*") {
    $env:PATH = $userPath + ";" + $env:PATH
}
# rustup 기본 경로 폴백
$cargoBin = "$env:USERPROFILE\.cargo\bin"
if ((Test-Path $cargoBin) -and $env:PATH -notlike "*\.cargo\bin*") {
    $env:PATH = $cargoBin + ";" + $env:PATH
}

npm run tauri dev 2>&1 | Tee-Object -FilePath $logPath
