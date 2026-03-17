# [Architect Note] 프런트엔드 기동 유틸리티 (PSScriptRoot Self-Location 패턴)
# wt.exe는 새 창을 독립 프로세스로 열기 때문에 부모의 환경 변수가 상속되지 않음.
# $PSScriptRoot (항상 스크립트 자신의 위치)를 기준으로 경로를 자체 계산하여 이 문제를 근본 해결.
. (Join-Path $PSScriptRoot "..\config\paths.ps1")
$projectRoot = Split-Path $PSScriptRoot -Parent
$targetDir = Join-Path $projectRoot "frontend"
$logsDir = Join-Path $projectRoot "logs"

if (!(Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }
$logPath = Join-Path $logsDir "frontend.log"

# C-1e: Set-Location + npm run tauri dev 전체를 Try-Catch로 보호
Try {
    Set-Location -Path $targetDir
    Write-Output "[ECO] Frontend running in: $((Get-Location).Path)"
    Write-Output "[ECO] Logging to: $logPath"

    # wt.exe는 독립 프로세스로 열려 사용자 PATH가 누락됨 - cargo/rustup 경로 명시 주입
    $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    if ($userPath -and $env:PATH -notlike "*$userPath*") {
        $env:PATH = $userPath + ";" + $env:PATH
    }
    # rustup 기본 경로 폴백
    $cargoBin = "$env:USERPROFILE\$script:CARGO_BIN_SUBPATH"
    if ((Test-Path $cargoBin) -and $env:PATH -notlike "*\$script:CARGO_BIN_SUBPATH*") {
        $env:PATH = $cargoBin + ";" + $env:PATH
    }

    # [Fix] PowerShell이 stderr 출력을 치명적 에러로 오인하는 NativeCommandError 방지
    $oldEAP = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'

    if ($PSVersionTable.PSVersion.Major -ge 7) {
        $PSNativeCommandUseErrorActionPreference = $false
    }
    
    npm run tauri dev 2>&1 | Tee-Object -FilePath $logPath
    
    $ErrorActionPreference = $oldEAP
}
Catch {
    Write-Warning "프론트엔드 기동 실패: $_"
    exit 1
}
