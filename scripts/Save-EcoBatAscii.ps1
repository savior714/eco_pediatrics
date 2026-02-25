# TROUBLESHOOTING.md section 8: save eco.bat as ASCII so cmd.exe does not close at once
$root = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
$path = Join-Path $root "eco.bat"
$bytes = [System.IO.File]::ReadAllBytes($path)
$enc = if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) { [System.Text.Encoding]::Unicode }
       elseif ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { [System.Text.Encoding]::UTF8 }
       else { [System.Text.Encoding]::UTF8 }
$content = $enc.GetString($bytes)
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::ASCII)
Write-Host "Saved: $path (ASCII)."
