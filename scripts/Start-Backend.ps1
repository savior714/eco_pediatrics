# [Architect Note] 백엔드 기동 유틸리티 (PSScriptRoot Self-Location 패턴)
# wt.exe는 새 창을 독립 프로세스로 열기 때문에 부모의 환경 변수가 상속되지 않음.
# $PSScriptRoot (항상 스크립트 자신의 위치)를 기준으로 경로를 자체 계산하여 이 문제를 근본 해결.
$projectRoot = Split-Path $PSScriptRoot -Parent
$targetDir = Join-Path $projectRoot "backend"

Set-Location -Path $targetDir
Write-Host "[ECO] Backend running in: $((Get-Location).Path)" -ForegroundColor Green
uv run uvicorn main:app --reload --port 8000
