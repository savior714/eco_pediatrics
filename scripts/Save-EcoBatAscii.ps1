# TROUBLESHOOTING.md section 8: save eco.bat as ASCII so cmd.exe does not close at once
. (Join-Path $PSScriptRoot "..\config\paths.ps1")
$root = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
$path = Join-Path $root $script:ECO_BAT_NAME

# C-2: 파일 존재 여부 사전 검증
if (-not (Test-Path $path)) {
    Write-Warning "대상 파일이 존재하지 않습니다: $path"
    exit 1
}

# C-1a: 파일 I/O 전체를 Try-Catch로 보호
Try {
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $enc = if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) { [System.Text.Encoding]::Unicode }
           elseif ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { [System.Text.Encoding]::UTF8 }
           else { [System.Text.Encoding]::UTF8 }
    $content = $enc.GetString($bytes)
    [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::ASCII)
    Write-Output "Saved: $path (ASCII)."
}
Catch {
    Write-Warning "eco.bat ASCII 변환 실패: $_"
    exit 1
}
