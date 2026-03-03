param([string]$Root)

# [Architect Note] Windows 11 Native & PowerShell 7(pwsh) 표준 준수 리팩토링
# Windows Terminal(wt.exe)의 복잡한 쿼팅 이슈를 방지하고 환경 일관성을 위해 모든 쉘을 pwsh로 통일함.

# 1. Root 경로 보정 (파라미터가 없으면 스크립트 위치 기준으로 자동 설정)
if ([string]::IsNullOrWhiteSpace($Root)) {
    $Root = Split-Path -Parent $PSScriptRoot
    Write-Host "[ECO] Root path not provided, using detected root: $Root" -ForegroundColor Yellow
}

# 경로 유효성 검사 및 절대 경로 변환
$Root = Resolve-Path $Root | Select-Object -ExpandProperty Path
$backendDir = Join-Path $Root "backend"
$frontendDir = Join-Path $Root "frontend"
$logsDir = Join-Path $Root "logs"
$logFile = Join-Path $logsDir "frontend.log"

# 필수 디렉토리 생성
if (!(Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }

# 2. 각 패널에서 실행할 커맨드 정의 (Env-Delegation 패턴)
# 쿼팅(Quoting) 지옥 및 작업 디렉토리 유실을 방지하기 위해 모든 경로는 환경 변수로 상속함.
$env:ECO_BE_DIR = $backendDir
$env:ECO_FE_DIR = $frontendDir
$env:ECO_LOG_FILE = $logFile

$beScript = Join-Path $PSScriptRoot "Start-Backend.ps1"
$feScript = Join-Path $PSScriptRoot "Start-Frontend.ps1"

# 3. Windows Terminal (wt.exe) 실행 인자 문자열 구성
# 중요: 실행 파일(pwsh.exe)과 인자들을 절대 '전체 쿼팅'하지 않음.
# 전용 스크립트(.ps1) 내부에서 환경 변수를 읽어 Set-Location을 직접 수행하므로 가장 안정적임.
$argStr = "--maximized -w 0 nt --title `"Eco-Backend`" -d `"$backendDir`" pwsh.exe -NoExit -File `"$beScript`" ; " +
          "split-pane -V --size 0.5 -d `"$frontendDir`" pwsh.exe -NoExit -File `"$feScript`""

Write-Host "[DEBUG] Argument String: $argStr" -ForegroundColor Gray

Write-Host "[DEBUG] Argument String: $argStr" -ForegroundColor Gray

# 4. 프로세스 실행
try {
    Write-Host "[ECO] Starting Windows Terminal Dev Stack (pwsh)..." -ForegroundColor Cyan
    Write-Host "      Root: $Root"
    
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "wt.exe"
    $psi.Arguments = $argStr
    $psi.UseShellExecute = $true
    
    $proc = [System.Diagnostics.Process]::Start($psi)
    
    if ($null -eq $proc) {
        Write-Error "[CRITICAL] Windows Terminal을 시작할 수 없습니다. wt.exe가 설치되어 있는지 확인하십시오."
    }
} catch {
    Write-Error "[CRITICAL] Dev Mode 실행 중 오류 발생: $($_.Exception.Message)"
    Start-Sleep -Seconds 5
}
