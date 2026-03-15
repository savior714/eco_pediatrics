# docs/ 내 마크다운 상대 경로 링크 검증 (REFACTOR_DOCS_PLAN.md §5.1)
# 사용: ./scripts/Verify-DocsLinks.ps1 [ -Fix ]
# -Fix 미지정: 깨진 링크만 보고. -Fix 지정: prompts/X.md -> prompts/archive/X.md 치환만 적용 (아카이브 이동 대응).

param([switch]$Fix)

$ErrorActionPreference = "Stop"

# C-3 SSOT: 공유 상수 Dot-sourcing (아카이브 파일명 목록)
. (Join-Path $PSScriptRoot "Shared-DocsConstants.ps1")
. (Join-Path $PSScriptRoot "..\config\paths.ps1")

$repoRoot = (Get-Location).Path
$docsRoot = $script:DOCS_ROOT_REL
$archiveDir = $script:DOCS_ARCHIVE_REL

# C-3: $archivedNames을 공유 상수로 대체
$archivedNames = $script:ARCHIVED_DOC_NAMES

$linkPattern = '\]\(([^)]+\.md)\)'
$broken = @()
$fixes = @()

Write-Output "문서 링크 검증을 시작합니다..."

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
    Write-Warning "[X] Broken (대상 없음, archive에도 없음):"
    $broken | ForEach-Object { Write-Output "  $($_.File): $($_.Link)" }
}
if ($fixes.Count -gt 0) {
    Write-Output "[!] 수정 가능 (Archive에서 발견):"
    $fixes | ForEach-Object { Write-Output "  $($_.File): $($_.Link) -> $($_.NewLink)" }
    if ($Fix) {
        $rootFull = [System.IO.Path]::GetFullPath($repoRoot)
        foreach ($e in $fixes) {
            $f = Join-Path $rootFull $e.File.Replace('/', [IO.Path]::DirectorySeparatorChar)

            # C-1d: 파일 존재 여부 확인 후 Set-Content를 Try-Catch로 보호
            if (-not (Test-Path $f)) {
                Write-Warning "파일을 찾을 수 없어 건너뜁니다: $($e.File)"
                continue
            }
            Try {
                (Get-Content $f -Raw) -replace [regex]::Escape("]($($e.Link))"), "]($($e.NewLink))" | Set-Content $f -NoNewline
                Write-Output "[수정 완료] $($e.File)"
            }
            Catch {
                Write-Warning "파일 수정 실패: $($e.File) — $_"
            }
        }
    } else {
        Write-Output "링크 자동 수정 적용: ./scripts/Verify-DocsLinks.ps1 -Fix"
    }
}
if ($broken.Count -eq 0 -and $fixes.Count -eq 0) {
    Write-Output "깨진 링크 없음."
}

Write-Output "검증 작업 종료."

$script:BrokenCount = $broken.Count
$script:FixesCount = $fixes.Count
