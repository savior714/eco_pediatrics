# docs/ 리팩토링 실행 (eco_pediatrics — REFACTOR_DOCS_PLAN.md 기준)
# 사용: pwsh -ExecutionPolicy Bypass -File scripts\Invoke-DocsRefactor.ps1
# 실행 전: REFACTOR_DOCS_PLAN.md §7 "실행 전 체크리스트" 확인 권장.
# 실행 후: §5.1 Broken Links 검증(scripts/Verify-DocsLinks.ps1), 필요 시 VERIFICATION_GLOBAL_RULES.md §4 갱신.

$ErrorActionPreference = "Stop"

# 프로젝트 루트 결정 (스크립트 위치 기준, Invoke-Repomix.ps1과 동일)
$root = if ($PSScriptRoot) {
    $scriptsParent = Split-Path -Parent $PSScriptRoot
    if (Test-Path (Join-Path $scriptsParent "docs") -PathType Container) { $scriptsParent } else { (Get-Location).Path }
} else {
    (Get-Location).Path
}

$archivePath = Join-Path $root "docs" "prompts" "archive"
$promptsPath = Join-Path $root "docs" "prompts"

# 1. 아카이브 디렉터리 생성
if (!(Test-Path $archivePath)) {
    New-Item -ItemType Directory -Path $archivePath -Force | Out-Null
    Write-Host "Created: $archivePath" -ForegroundColor Cyan
}

# 2. 완료된 이슈용 프롬프트 → archive (REFACTOR_DOCS_PLAN §4.2)
$filesToArchive = @(
    "DIAGNOSIS_PATIENT_DETAIL_MODAL_LOGIC.md",
    "DIAGNOSIS_DASHBOARD_PAGE_LOGIC.md",
    "DIAGNOSIS_USE_DASHBOARD_STATS_LOGIC.md",
    "DIAGNOSIS_MEAL_MODULES_LOGIC.md",
    "DIAGNOSIS_USEVITALS_LOGIC.md",
    "PROMPT_COMPLETED_DOCS_NOT_SHOWING.md",
    "PROMPT_STATION_INITIAL_LOAD_EMPTY.md",
    "PROMPT_OTHER_LLM_STATION_GRID_EMPTY.md",
    "PROMPT_OTHER_LLM_STATION_GRID_DB_SQL_VERIFICATION.md",
    "PROMPT_ECO_BAT_1_CLOSES_TERMINAL.md",
    "PROMPT_WT_LAYOUT_INVESTIGATION.md",
    "PROMPT_STATION_DEV_BUTTONS_MISSING.md",
    "PROMPT_MEAL_SYNC_SUBMODAL_STALE.md",
    "PROMPT_DEPENDENCY_ISSUES.md",
    "PROMPT_REFACTOR_LOGIC_ONLY_PROTOCOL.md",
    "PROMPT_REFACTOR_AREAS_AND_CHECKLIST.md",
    "PROMPT_LOGIC_ONLY_REFACTOR_BATCH.md"
)

foreach ($file in $filesToArchive) {
    $src = Join-Path $promptsPath $file
    if (Test-Path $src) {
        Move-Item -Path $src -Destination $archivePath -Force
        Write-Host "Archived: $file" -ForegroundColor Cyan
    }
}

# 3. 루트 docs 중복 제거 (REFACTOR_DOCS_PLAN §4.1 — prompts/만 유지)
$duplicates = @(
    "docs\ERROR_MONITOR_DEBUG_PROMPT.md",
    "docs\PROMPT_STATION_DEV_BUTTONS_MISSING.md",
    "docs\PROMPT_WT_LAYOUT_INVESTIGATION.md"
)
foreach ($rel in $duplicates) {
    $path = Join-Path $root $rel
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "Removed duplicate: $rel" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Done. Next: Run link check and fix if needed (REFACTOR_DOCS_PLAN §5.1):" -ForegroundColor Green
Write-Host "  pwsh -File scripts/Verify-DocsLinks.ps1" -ForegroundColor Gray
Write-Host "  pwsh -File scripts/Verify-DocsLinks.ps1 -Fix" -ForegroundColor Gray
Write-Host "Update docs/VERIFICATION_GLOBAL_RULES.md §4 if document list changed." -ForegroundColor Green
