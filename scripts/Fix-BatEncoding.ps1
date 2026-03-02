# Fix-BatEncoding.ps1
# eco.bat etc. run as UTF-8 cause "window closes at once" (cmd misparses).
# Run once from repo root to rewrite .bat as ANSI(CP949). See TROUBLESHOOTING.md section 8.
# Usage: pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/Fix-BatEncoding.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $root "eco.bat"))) { $root = (Get-Location).Path }
$batFiles = @("eco.bat", "start_backend_pc.bat")
$cp949 = [System.Text.Encoding]::GetEncoding(949)

foreach ($name in $batFiles) {
    $path = Join-Path $root $name
    if (-not (Test-Path $path)) { continue }
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $enc = [System.Text.Encoding]::UTF8
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $enc = [System.Text.Encoding]::UTF8
    } elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
        $enc = [System.Text.Encoding]::Unicode
    }
    $content = $enc.GetString($bytes)
    [System.IO.File]::WriteAllText($path, $content, $cp949)
    Write-Host "[OK] $name -> CP949"
}

Write-Host "Done. Run eco.bat again (double-click or from terminal)."
