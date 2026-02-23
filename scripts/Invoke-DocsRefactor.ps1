# docs/ 리팩토링 실행 스크립트 (REFACTOR_DOCS_PLAN.md 기준)
# 실행 전: REFACTOR_DOCS_PLAN.md §7 "실행 전 체크리스트" 확인 권장.

$ErrorActionPreference = "Stop"
$archivePath = "docs/prompts/archive"

# 1. 아카이브 디렉터리 생성
if (!(Test-Path $archivePath)) {
    New-Item -ItemType Directory -Path $archivePath -Force | Out-Null
    Write-Host "Created: $archivePath" -ForegroundColor Cyan
}

# 2. 완료된 이슈용 프롬프트 → archive (계획서 §4.2 목록)
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
    $src = Join-Path "docs/prompts" $file
    if (Test-Path $src) {
        Move-Item -Path $src -Destination $archivePath -Force
        Write-Host "Archived: $file" -ForegroundColor Cyan
    }
}

# 3. 루트 docs 중복 제거 (계획서 §4.1)
$duplicates = @(
    "docs/ERROR_MONITOR_DEBUG_PROMPT.md",
    "docs/PROMPT_STATION_DEV_BUTTONS_MISSING.md",
    "docs/PROMPT_WT_LAYOUT_INVESTIGATION.md"
)
foreach ($path in $duplicates) {
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "Removed duplicate: $path" -ForegroundColor Yellow
    }
}

Write-Host "Done. Run Broken Links check (REFACTOR_DOCS_PLAN.md §5.1) and update TROUBLESHOOTING/SESSION links if needed." -ForegroundColor Green
