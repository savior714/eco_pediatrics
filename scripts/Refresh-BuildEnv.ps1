# Refresh-BuildEnv.ps1
# Windows SDK(UCRT 포함) 경로를 INCLUDE/LIB/PATH에 동적 탐색하여 영구 등록.
# pyiceberg, pyroaring 등 C 확장 빌드 시 io.h 미발견 문제의 근본 해결.
# 사용법: powershell -ExecutionPolicy Bypass -File scripts\Refresh-BuildEnv.ps1

$ErrorActionPreference = "Stop"
$sdkRoot = "${env:ProgramFiles(x86)}\Windows Kits\10\Include"
if (-not (Test-Path $sdkRoot)) {
    Write-Host "[WARN] Windows SDK path not found: $sdkRoot"
    Write-Host "       Install 'Windows 10/11 SDK' via Visual Studio Installer."
    exit 1
}

# 1. Find latest SDK version (10.0.xxxxx.0 format)
$folders = Get-ChildItem $sdkRoot -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "^10\.\d" }
if (-not $folders) {
    Write-Host "[WARN] No 10.x version folder found under Windows Kits 10 Include."
    exit 1
}
$latestSdk = $folders | Sort-Object Name -Descending | Select-Object -First 1
$ver = $latestSdk.Name

# 2. Assemble required paths (UCRT, shared, um, winrt)
$sdkInc = "${env:ProgramFiles(x86)}\Windows Kits\10\Include\$ver"
$sdkLib = "${env:ProgramFiles(x86)}\Windows Kits\10\Lib\$ver"
$sdkBin = "${env:ProgramFiles(x86)}\Windows Kits\10\bin\$ver\x64"

$newInclude = "$sdkInc\ucrt;$sdkInc\shared;$sdkInc\um;$sdkInc\winrt"
$newLib = "$sdkLib\ucrt\x64;$sdkLib\um\x64"

# 3. Persist to user environment variables (skip if already set)
$userInclude = [System.Environment]::GetEnvironmentVariable("INCLUDE", "User")
$userLib = [System.Environment]::GetEnvironmentVariable("LIB", "User")
$userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")

$updated = $false
if ($userInclude -notlike "*$ver*") {
    $mergedInclude = if ([string]::IsNullOrEmpty($userInclude)) { $newInclude } else { "$userInclude;$newInclude" }
    [System.Environment]::SetEnvironmentVariable("INCLUDE", $mergedInclude, "User")
    $env:INCLUDE = $mergedInclude + ";" + [System.Environment]::GetEnvironmentVariable("INCLUDE", "Machine")
    $updated = $true
} else {
    $env:INCLUDE = [System.Environment]::GetEnvironmentVariable("INCLUDE", "User") + ";" + [System.Environment]::GetEnvironmentVariable("INCLUDE", "Machine")
}

if ($userLib -notlike "*$ver*") {
    $mergedLib = if ([string]::IsNullOrEmpty($userLib)) { $newLib } else { "$userLib;$newLib" }
    [System.Environment]::SetEnvironmentVariable("LIB", $mergedLib, "User")
    $env:LIB = $mergedLib + ";" + [System.Environment]::GetEnvironmentVariable("LIB", "Machine")
    $updated = $true
} else {
    $env:LIB = [System.Environment]::GetEnvironmentVariable("LIB", "User") + ";" + [System.Environment]::GetEnvironmentVariable("LIB", "Machine")
}

if ($userPath -notlike "*$sdkBin*") {
    $mergedPath = if ([string]::IsNullOrEmpty($userPath)) { $sdkBin } else { "$sdkBin;$userPath" }
    [System.Environment]::SetEnvironmentVariable("PATH", $mergedPath, "User")
    $env:PATH = $sdkBin + ";" + $env:PATH
    $updated = $true
} else {
    $env:PATH = $sdkBin + ";" + $env:PATH
}

if ($updated) {
    Write-Host "[OK] Windows SDK $ver paths registered permanently in INCLUDE/LIB/PATH."
} else {
    Write-Host "[OK] SDK $ver paths already registered. Applied to current session."
}
Write-Host "      Open a new terminal for permanent settings. Available immediately in current session."
