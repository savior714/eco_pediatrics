# Get-SdkVersion.ps1
# Windows Kits 10 latest SDK version (folder name) written to -OutFile. Avoids for /f in batch.
# Usage: powershell -File Get-SdkVersion.ps1 -OutFile "path\to\sdk_ver.txt"

param([string]$OutFile)
$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "..\config\paths.ps1")
$sdkRoot = "${env:ProgramFiles(x86)}\$script:SDK_KITS_SUBPATH\Include"
if (-not (Test-Path $sdkRoot)) { exit 0 }
$folder = Get-ChildItem -LiteralPath $sdkRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^10\.\d' } |
    Sort-Object Name -Descending |
    Select-Object -First 1
if ($folder -and $OutFile) {
    $folder.Name | Set-Content -Path $OutFile -Encoding ASCII
}
