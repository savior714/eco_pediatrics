# docs/ 내 마크다운 상대 경로 링크 검증 (REFACTOR_DOCS_PLAN.md §5.1)
# 사용: ./scripts/Verify-DocsLinks.ps1 [ -Fix ]
# -Fix 미지정: 깨진 링크만 보고. -Fix 지정: prompts/X.md -> prompts/archive/X.md 치환만 적용 (아카이브 이동 대응).

param([switch]$Fix)

$ErrorActionPreference = "Stop"
$repoRoot = (Get-Location).Path
$docsRoot = "docs"
$archiveDir = "docs/prompts/archive"

# 아카이브로 이동된 파일명 목록 (계획서 §4.2와 동기화)
$archivedNames = @(
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

$linkPattern = '\]\(([^)]+\.md)\)'
$broken = @()
$fixes = @()

Write-Host "문서 링크 검증을 시작합니다..." -ForegroundColor Cyan

Get-ChildItem $docsRoot -Recurse -Filter *.md | ForEach-Object {
    $file = $_
    $dir = $file.DirectoryName
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (!$content) { return }

    $matches = [regex]::Matches($content, $linkPattern)
    foreach ($m in $matches) {
        $path = $m.Groups[1].Value
        if ($path -match '^https?://') { continue }
        $targetFull = [System.IO.Path]::GetFullPath((Join-Path $dir $path))
        $rootFull = [System.IO.Path]::GetFullPath($repoRoot)
        if (!$targetFull.StartsWith($rootFull)) { continue }

        $relativeToRepo = $targetFull.Substring($rootFull.Length).TrimStart('\', '/').Replace('\', '/')
        $exists = Test-Path $targetFull

        if ($exists) { continue }

        $fileName = [System.IO.Path]::GetFileName($path)
        $suggestPath = "prompts/archive/$fileName"
        $suggestFull = Join-Path $rootFull $suggestPath.Replace('/', [IO.Path]::DirectorySeparatorChar)
        $isArchived = $archivedNames -contains $fileName -and (Test-Path $suggestFull)

        $entry = [PSCustomObject]@{
            File   = $file.FullName.Replace($rootFull, '').TrimStart('\', '/')
            Link   = $path
            Fixed  = $isArchived
            NewLink = $suggestPath
        }

        if ($isArchived) {
            $fixes += $entry
        } else {
            $broken += $entry
        }
    }
}

# 보고
if ($broken.Count -gt 0) {
    Write-Host "[X] Broken (대상 없음, archive에도 없음):" -ForegroundColor Red
    $broken | ForEach-Object { Write-Host "  $($_.File): $($_.Link)" }
}
if ($fixes.Count -gt 0) {
    Write-Host "[!] 수정 가능 (Archive에서 발견):" -ForegroundColor Yellow
    $fixes | ForEach-Object { Write-Host "  $($_.File): $($_.Link) -> $($_.NewLink)" }
    if ($Fix) {
        $rootFull = [System.IO.Path]::GetFullPath($repoRoot)
        foreach ($e in $fixes) {
            $f = Join-Path $rootFull $e.File.Replace('/', [IO.Path]::DirectorySeparatorChar)
            (Get-Content $f -Raw) -replace [regex]::Escape("]($($e.Link))"), "]($($e.NewLink))" | Set-Content $f -NoNewline
            Write-Host "[수정 완료] $($e.File)" -ForegroundColor Green
        }
    } else {
        Write-Host "링크 자동 수정 적용: ./scripts/Verify-DocsLinks.ps1 -Fix" -ForegroundColor Gray
    }
}
if ($broken.Count -eq 0 -and $fixes.Count -eq 0) {
    Write-Host "깨진 링크 없음." -ForegroundColor Green
}

Write-Host "검증 작업 종료." -ForegroundColor Cyan

$script:BrokenCount = $broken.Count
$script:FixesCount = $fixes.Count
