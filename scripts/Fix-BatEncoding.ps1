# Fix-BatEncoding.ps1
# eco.bat etc. run as UTF-8 cause "window closes at once" (cmd misparses).
# Run once from repo root to rewrite .bat as ANSI(CP949). See TROUBLESHOOTING.md section 8.
# Usage: pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/Fix-BatEncoding.ps1

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "..\config\paths.ps1")
$root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $root "eco.bat"))) { $root = (Get-Location).Path }
$batFiles = $script:ECO_BAT_FILES
$cp949 = [System.Text.Encoding]::GetEncoding(949)

foreach ($name in $batFiles) {
    $path = Join-Path $root $name
    if (-not (Test-Path $path)) { continue }

    # C-1b: 파일별 I/O를 Try-Catch로 보호 — 실패 시 다음 파일 계속 처리
    Try {
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $enc = [System.Text.Encoding]::UTF8
        if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
            $enc = [System.Text.Encoding]::UTF8
        } elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
            $enc = [System.Text.Encoding]::Unicode
        }
        $content = $enc.GetString($bytes)
        [System.IO.File]::WriteAllText($path, $content, $cp949)
        Write-Output "[OK] $name -> CP949"
    }
    Catch {
        Write-Warning "[$name] CP949 변환 실패: $_"
        continue
    }
}

Write-Output "Done. Run eco.bat again (double-click or from terminal)."
