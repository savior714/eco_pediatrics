# 30분 AI 워크플로우용: 코드베이스 덤프 생성 (docs/WORKFLOW_30MIN_AI_CODING.md 참고)
# 사용: pwsh -ExecutionPolicy Bypass -File scripts\Invoke-Repomix.ps1
# 출력: docs/repomix-output.md (백엔드+프론트+docs+supabase 통합 한 파일)

$ErrorActionPreference = "Stop"
$root = if ($PSScriptRoot) { Split-Path -Parent (Split-Path -Parent $PSScriptRoot) } else { (Get-Location).Path }
if (-not (Test-Path (Join-Path $root "frontend")) -and -not (Test-Path (Join-Path $root "backend"))) {
    $root = (Get-Location).Path
}

$outDir = Join-Path $root "docs"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$fullOut = Join-Path $outDir "repomix-output.md"

$fullInclude = "backend/main.py,backend/routers/**,backend/services/**,backend/models.py,backend/constants/**,backend/utils.py,backend/schemas.py,backend/database.py,backend/dependencies.py,backend/logger.py,backend/websocket_manager.py,backend/tests/**,backend/scripts/**,supabase/migrations/**,supabase/schema.sql,docs/**,frontend/src/**"
$fullIgnore = "docs/repomix*.md,docs/tree.txt"

Push-Location $root
try {
    npx repomix@latest --style markdown --include $fullInclude -i $fullIgnore -o $fullOut --quiet 2>&1
    if (Test-Path $fullOut) { Write-Host "Created: $fullOut" }
}
finally {
    Pop-Location
}
