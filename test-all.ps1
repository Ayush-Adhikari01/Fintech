# RegTech Sentinel - Automated Test Suite Runner

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RegTech Sentinel - Automated Test Suite" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$FintechRoot = $PSScriptRoot
$allPassed = $true

# 1. Run Python ML Tests
Write-Host "[1/3] Running Python ML Unit Tests (Isolation Forest)..." -ForegroundColor White
python -m unittest (Join-Path $FintechRoot "ml_service\tests\test_ml.py")
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Python ML unit tests failed." -ForegroundColor Red
    $allPassed = $false
} else {
    Write-Host "  [PASS] Python ML unit tests passed successfully." -ForegroundColor Green
}
Write-Host ""

# 2. Run Backend Unit & Integration Tests
Write-Host "[2/3] Running Backend API & Rule Engine Vitest Suite..." -ForegroundColor White
Push-Location (Join-Path $FintechRoot "backend")
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Backend tests failed." -ForegroundColor Red
    $allPassed = $false
} else {
    Write-Host "  [PASS] Backend tests passed successfully." -ForegroundColor Green
}
Pop-Location
Write-Host ""

# 3. Validate Frontend Production Build
Write-Host "[3/3] Validating Frontend Production Build & TypeScript..." -ForegroundColor White
Push-Location (Join-Path $FintechRoot "frontend")
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Frontend build validation failed." -ForegroundColor Red
    $allPassed = $false
} else {
    Write-Host "  [PASS] Frontend production build succeeded." -ForegroundColor Green
}
Pop-Location
Write-Host ""

Write-Host "============================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "  ALL AUTOMATED TESTS & BUILDS PASSED! (100% HEALTHY)" -ForegroundColor Green
} else {
    Write-Host "  SOME TESTS OR BUILDS FAILED. INSPECT LOGS ABOVE." -ForegroundColor Red
}
Write-Host "============================================================" -ForegroundColor Cyan
