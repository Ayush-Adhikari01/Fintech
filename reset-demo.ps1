# RegTech Sentinel - Windows 11 Database Reset Script
# Restores the reproducible 14-day baseline synthetic dataset

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Resetting RegTech Sentinel Database Baseline..." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

$FintechRoot = $PSScriptRoot
Push-Location (Join-Path $FintechRoot "backend")

try {
    npx tsx src/db/seed.ts
    Write-Host ""
    Write-Host "Database successfully restored to baseline state:" -ForegroundColor Green
    Write-Host "  - 25 Synthetic Customers" -ForegroundColor White
    Write-Host "  - 40 Accounts" -ForegroundColor White
    Write-Host "  - 20 Global Counterparties" -ForegroundColor White
    Write-Host "  - 155 Historical Transactions" -ForegroundColor White
    Write-Host "  - 56 Compliance Alerts & Case Files" -ForegroundColor White
    Write-Host "  - 20 Synthetic Sanctions Watchlist Entities" -ForegroundColor White
    Write-Host "  - 11 Deterministic Risk Intelligence Rules" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "Error resetting database: $_" -ForegroundColor Red
} finally {
    Pop-Location
}

Write-Host "============================================================" -ForegroundColor Cyan
