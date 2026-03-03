# [Architect Note] DNS 안정성을 위한 IPv6 비활성화 자동화 스크립트
# 관리자 권한 여부를 체크하고, 가능한 경우 IPv6를 비활성화합니다.

$ComponentID = "ms_tcpip6"
$adapters = Get-NetAdapterBinding -ComponentID $ComponentID -ErrorAction SilentlyContinue

if ($adapters -and ($adapters.Enabled -contains $true)) {
    Write-Host "[ECO] IPv6 detected. Attempting to disable for DNS stability..." -ForegroundColor Cyan
    try {
        Disable-NetAdapterBinding -Name "*" -ComponentID $ComponentID -ErrorAction Stop
        Write-Host "      - IPv6 disabled successfully." -ForegroundColor Green
    } catch {
        Write-Host "      - [INFO] Admin rights needed to disable IPv6. Run as Administrator if DNS errors persist." -ForegroundColor Yellow
    }
} else {
    Write-Host "[ECO] IPv6 is already disabled or not found." -ForegroundColor Cyan
}
