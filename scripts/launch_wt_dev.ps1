param([string]$Root)

# [Architect Note] Windows 11 Native & PowerShell 7(pwsh) 표준 준수 리팩토링
# Windows Terminal(wt.exe)의 복잡한 쿼팅 이슈를 방지하고 환경 일관성을 위해 모든 쉘을 pwsh로 통일함.
. (Join-Path $PSScriptRoot "..\config\paths.ps1")

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

# [Architect Fix] 실행 엔진 감지 (pwsh vs powershell) — config/paths.ps1 상수 참조
$engine = $script:PS_ENGINE_PRIMARY
if (!(Get-Command $engine -ErrorAction SilentlyContinue)) {
    $engine = $script:PS_ENGINE_FALLBACK
}

# 3. Windows Terminal (wt.exe) 실행 인자 문자열 구성
# 중요: 실행 파일($engine)과 인자들을 절대 '전체 쿼팅'하지 않음.
# -w -1: 새 창에서 실행 (기존 창에 종속되지 않아 가장 안정적)
$argStr = "--maximized -w -1 nt --title `"Eco-Backend`" -d `"$backendDir`" $engine -NoExit -File `"$beScript`" ; " +
          "split-pane -V --size 0.5 -d `"$frontendDir`" $engine -NoExit -File `"$feScript`""

Write-Host "[DEBUG] Using Shell Engine: $engine" -ForegroundColor Gray
Write-Host "[DEBUG] Argument String: $argStr" -ForegroundColor Gray

# 4. 프로세스 실행
try {
    # wt.exe 존재 여부 선제적 확인
    if (!(Get-Command wt.exe -ErrorAction SilentlyContinue)) {
        throw "Windows Terminal (wt.exe)을 찾을 수 없습니다. Microsoft Store에서 'Windows Terminal'을 설치하거나 설정을 확인해 주세요."
    }

    Write-Host "[ECO] Starting Windows Terminal Dev Stack (pwsh)..." -ForegroundColor Cyan
    Write-Host "      Root: $Root"
    
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "wt.exe"
    $psi.Arguments = $argStr
    $psi.UseShellExecute = $true
    
    $proc = [System.Diagnostics.Process]::Start($psi)
    
    if ($null -eq $proc) {
        throw "Windows Terminal 시작 시도 후 프로세스 핸들을 가져오지 못했습니다."
    }

    # 성공 시 약간 대기하여 팝업 여부 확인 (옵션)
    Start-Sleep -Milliseconds 500
} catch {
    Write-Host ""
    Write-Host " [CRITICAL ERROR] " -BackgroundColor DarkRed -ForegroundColor White
    Write-Host "$($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "잠시 후 복구를 시도하거나 관리자에게 문의하십시오."
    Start-Sleep -Seconds 10
    exit 1
}
