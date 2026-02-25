# 30분 AI 워크플로우용: 코드베이스 덤프 생성 (docs/WORKFLOW_30MIN_AI_CODING.md 참고)
# 사용: pwsh -ExecutionPolicy Bypass -File scripts\Invoke-Repomix.ps1
# 출력: docs/repomix-output.md (백엔드+프론트+docs+supabase 통합 한 파일)
#
# [민감정보 차단] repomix는 기본적으로 .gitignore를 적용하나, 방어적 차원에서 스크립트에서도
# .env, API 키·인증서 파일을 -i(ignore)로 명시적으로 제외한다. include 목록에 .env 경로가 없어도
# 툴 기본 동작 변경·다른 호출 경로 대비해 이중으로 차단한다.

$ErrorActionPreference = "Stop"
$root = if ($PSScriptRoot) { Split-Path -Parent (Split-Path -Parent $PSScriptRoot) } else { (Get-Location).Path }
if (-not (Test-Path (Join-Path $root "frontend")) -and -not (Test-Path (Join-Path $root "backend"))) {
    $root = (Get-Location).Path
}

$outDir = Join-Path $root "docs"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$fullOut = Join-Path $outDir "repomix-output.md"

$fullInclude = "backend/main.py,backend/routers/**,backend/services/**,backend/models.py,backend/constants/**,backend/utils.py,backend/schemas.py,backend/database.py,backend/dependencies.py,backend/logger.py,backend/websocket_manager.py,backend/scripts/**,backend/requirements*.txt,supabase/migrations/**,supabase/schema.sql,supabase/config.toml,docs/**,frontend/src/**,frontend/package.json,frontend/next.config.*,frontend/tsconfig.json"
# 출력물 재귀 차단 + 아카이브·민감정보 제외
$fullIgnore = "docs/repomix*.md,docs/tree.txt,docs/prompts/archive/**,**/.env,**/.env.*,**/.env.local,**/*.pem,**/service-account*.json,**/*.key"

Push-Location $root
try {
    npx repomix@latest --style markdown --include $fullInclude -i $fullIgnore -o $fullOut --quiet 2>&1
    if (Test-Path $fullOut) { Write-Host "Created: $fullOut" }
}
finally {
    Pop-Location
}
