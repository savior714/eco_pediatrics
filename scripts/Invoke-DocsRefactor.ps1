# docs/ 리팩토링 실행 (eco_pediatrics — REFACTOR_DOCS_PLAN.md 기준)
# 사용: pwsh -ExecutionPolicy Bypass -File scripts\Invoke-DocsRefactor.ps1
# 실행 전: REFACTOR_DOCS_PLAN.md §7 "실행 전 체크리스트" 확인 권장.
# 실행 후: §5.1 Broken Links 검증(scripts/Verify-DocsLinks.ps1), 필요 시 VERIFICATION_GLOBAL_RULES.md §4 갱신.

$ErrorActionPreference = "Stop"

# C-3 SSOT: 공유 상수 Dot-sourcing (아카이브 파일명 목록)
. (Join-Path $PSScriptRoot "Shared-DocsConstants.ps1")
. (Join-Path $PSScriptRoot "..\config\paths.ps1")

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
    Write-Output "Created: $archivePath"
}

# 2. 완료된 이슈용 프롬프트 → archive (REFACTOR_DOCS_PLAN §4.2)
foreach ($file in $script:ARCHIVED_DOC_NAMES) {
    $src = Join-Path $promptsPath $file
    if (-not (Test-Path $src)) { continue }

    # C-1c: Move-Item을 Try-Catch로 보호
    Try {
        Move-Item -Path $src -Destination $archivePath -Force
        Write-Output "Archived: $file"
    }
    Catch {
        Write-Warning "아카이브 이동 실패 [$file]: $_"
    }
}

# 3. 루트 docs 중복 제거 (REFACTOR_DOCS_PLAN §4.1 — prompts/만 유지)
$duplicates = @(
    "$script:DOCS_ROOT_REL\ERROR_MONITOR_DEBUG_PROMPT.md",
    "$script:DOCS_ROOT_REL\PROMPT_STATION_DEV_BUTTONS_MISSING.md",
    "$script:DOCS_ROOT_REL\PROMPT_WT_LAYOUT_INVESTIGATION.md"
)
foreach ($rel in $duplicates) {
    $absPath = Join-Path $root $rel
    if (-not (Test-Path $absPath)) { continue }

    # C-1c: Remove-Item을 Try-Catch로 보호
    Try {
        Remove-Item $absPath -Force
        Write-Output "Removed duplicate: $rel"
    }
    Catch {
        Write-Warning "중복 파일 삭제 실패 [$rel]: $_"
    }
}

Write-Output ""
Write-Output "Done. Next: Run link check and fix if needed (REFACTOR_DOCS_PLAN §5.1):"
Write-Output "  pwsh -File scripts/Verify-DocsLinks.ps1"
Write-Output "  pwsh -File scripts/Verify-DocsLinks.ps1 -Fix"
Write-Output "Update docs/VERIFICATION_GLOBAL_RULES.md §4 if document list changed."
