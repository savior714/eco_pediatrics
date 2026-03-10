# Setup-Environment.ps1
# eco.bat [2] Environment Setup 전체 로직. cmd 배치 대신 PowerShell에서 실행하여
# npm/uv 등 래퍼 호출 및 괄호 파싱 크래시를 회피함. UTF-8 (no BOM) 저장.
# Usage: pwsh -NoProfile -ExecutionPolicy Bypass -File Setup-Environment.ps1 -ProjectRoot "C:\path\to\repo"

param([string]$ProjectRoot)
$ErrorActionPreference = "Stop"
if (-not $ProjectRoot) { $ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path }
$ProjectRoot = $ProjectRoot.TrimEnd('\', '/', '"')
$LogDir = "$ProjectRoot\logs"
$SetupLog = "$ProjectRoot\logs\eco_setup.log"
$ScriptDir = $PSScriptRoot

function Log-Message {
    param([string]$Msg)
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Msg`r`n"
    if (-not (Test-Path (Split-Path $SetupLog))) { New-Item -ItemType Directory -Path (Split-Path $SetupLog) -Force | Out-Null }
    [System.IO.File]::AppendAllText($SetupLog, $line, (New-Object System.Text.UTF8Encoding($false)))
}

# PowerShell 엔진 탐지: pwsh(PS7) 우선, 없으면 powershell(PS5) 폴백
$PsEngine = "pwsh"
try { $null = Get-Command pwsh -ErrorAction Stop } catch { $PsEngine = "powershell" }

# 0. Log start
Log-Message "--- Setup started ---"
Write-Host ""
Write-Host "[ECO] Running Setup (PowerShell)..."

# 1. Prerequisites
Write-Host "Checking prerequisites (Python, Node, uv)..."
try {
    $null = python --version 2>&1
} catch {
    Write-Host "[ERROR] Python not found. Please install Python 3.14.x."
    Log-Message "FAIL: Python not found"
    exit 1
}
try {
    $null = node -v 2>&1
} catch {
    Write-Host "[ERROR] Node.js not found. Please install Node.js v24.12.x."
    Log-Message "FAIL: Node.js not found"
    exit 1
}
try {
    $null = uv --version 2>&1
} catch {
    Write-Host "[ERROR] uv not found. Please install uv (pip install uv)."
    Log-Message "FAIL: uv not found"
    exit 1
}

# 2. Backend
Write-Host ""
Write-Host "[1/4] Setting up Backend..."
$BackendDir = "$ProjectRoot\backend"
Set-Location $BackendDir
if (-not (Test-Path ".venv")) {
    Write-Host "   - Creating virtual environment (uv)..."
    & uv venv .venv --python 3.14
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to create backend .venv with uv."
        Log-Message "FAIL: uv venv .venv --python 3.14"
        exit 1
    }
}

Write-Host "   - Configuring Build Environment (SDK Discovery)..."
try {
    & $PsEngine -NoProfile -ExecutionPolicy Bypass -File "$ScriptDir\Refresh-BuildEnv.ps1"
} catch {
    Write-Host "   - Refresh-BuildEnv: $($_.Exception.Message) (continuing)"
}
& $PsEngine -NoProfile -ExecutionPolicy Bypass -File "$ScriptDir\Get-SdkVersion.ps1" -OutFile "$ProjectRoot\logs\sdk_ver.txt"
$sdkVerPath = "$ProjectRoot\logs\sdk_ver.txt"
if (Test-Path $sdkVerPath) {
    $SdkVer = ([System.IO.File]::ReadAllText($sdkVerPath, [System.Text.Encoding]::UTF8)).Trim()
    if ($SdkVer) {
        $PF86 = ${env:ProgramFiles(x86)}
        $env:INCLUDE = "$PF86\Windows Kits\10\Include\$SdkVer\ucrt;$PF86\Windows Kits\10\Include\$SdkVer\shared;$PF86\Windows Kits\10\Include\$SdkVer\um;$PF86\Windows Kits\10\Include\$SdkVer\winrt;$env:INCLUDE"
        $env:LIB = "$PF86\Windows Kits\10\Lib\$SdkVer\ucrt\x64;$PF86\Windows Kits\10\Lib\$SdkVer\um\x64;$env:LIB"
        $env:PATH = "$PF86\Windows Kits\10\bin\$SdkVer\x64;$env:PATH"
    }
} else {
    Write-Host "   - Windows SDK not found. Build effort may fail for native deps (pyiceberg)."
}

Write-Host "   - Installing dependencies (uv pip)..."
& uv pip install --upgrade pip setuptools wheel cython
& uv pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] uv pip install failed."
    Log-Message "FAIL: uv pip install"
    exit 1
}
if (-not (Test-Path ".env")) {
    Write-Host "   - Creating .env from template..."
    Copy-Item ".env.example" ".env"
}
Set-Location $ProjectRoot

# 3. Frontend
Write-Host ""
Write-Host "[2/4] Setting up Frontend..."
$FrontendDir = "$ProjectRoot\frontend"
Set-Location $FrontendDir
Write-Host "   - Installing npm packages..."
& npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed."
    Log-Message "FAIL: npm install"
    exit 1
}
if (-not (Test-Path ".env.local")) {
    Write-Host "   - Creating .env.local from template..."
    Copy-Item ".env.example" ".env.local"
}
Set-Location $ProjectRoot

# 4. Doctor
Write-Host ""
Write-Host "[3/4] Running Environment Doctor..."
& python "$ProjectRoot\scripts\doctor.py"
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[WARN] Doctor reported issues. Check above. Log: $SetupLog"
    Log-Message "WARN: doctor.py reported failures"
    Write-Host ""
    Write-Host "Setup finished with warnings. Press any key to return to menu..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    Log-Message "OK: Setup complete (with doctor warnings)"
    exit 0
}

Log-Message "OK: Setup complete"
Write-Host ""
Write-Host "[ECO] Setup Complete."
exit 0
