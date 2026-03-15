# [Architect Note] 백엔드 기동 유틸리티 (PSScriptRoot Self-Location 패턴)
# wt.exe는 새 창을 독립 프로세스로 열기 때문에 부모의 환경 변수가 상속되지 않음.
# $PSScriptRoot (항상 스크립트 자신의 위치)를 기준으로 경로를 자체 계산하여 이 문제를 근본 해결.
$projectRoot = Split-Path $PSScriptRoot -Parent
$targetDir = Join-Path $projectRoot "backend"

# C-2b: 백엔드 디렉터리 존재 여부 사전 검증
if (-not (Test-Path $targetDir)) {
    Write-Warning "백엔드 디렉터리가 존재하지 않습니다: $targetDir"
    exit 1
}

# C-1f: Set-Location + uvicorn 기동 전체를 Try-Catch로 보호
Try {
    Set-Location -Path $targetDir
    Write-Output "[ECO] Backend running in: $((Get-Location).Path)"

    # wt.exe는 독립 프로세스로 열려 사용자 PATH가 누락됨 - 사용자 PATH 명시 주입
    $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    if ($userPath -and $env:PATH -notlike "*$userPath*") {
        $env:PATH = $userPath + ";" + $env:PATH
    }

    uv run uvicorn main:app --reload --port 8000
}
Catch {
    Write-Warning "백엔드 기동 실패: $_"
    exit 1
}
