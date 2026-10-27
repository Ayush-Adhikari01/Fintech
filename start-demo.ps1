# RegTech Sentinel - Windows 11 One-Command Startup Script
# Automatically initializes database, ML model, backend, and frontend

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RegTech Sentinel - Real-Time Risk Intelligence" -ForegroundColor Yellow
Write-Host "  Detect Risk. Explain Decisions. Act with Confidence." -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$FintechRoot = $PSScriptRoot

# Step 1: Environment & Dependency Validation
Write-Host "[1/6] Inspecting runtime environment..." -ForegroundColor White

try {
    $nodeVersion = node -v
    Write-Host "  - Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Node.js is not found on PATH. Please install Node.js (v20+)." -ForegroundColor Red
    exit 1
}

try {
    $pythonVersion = python --version
    Write-Host "  - Python detected: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Python 3 is not found on PATH." -ForegroundColor Red
    exit 1
}

# Step 2: Validate Environment File
Write-Host "[2/6] Validating environment configuration..." -ForegroundColor White
$backendEnv = Join-Path $FintechRoot "backend\.env"
$exampleEnv = Join-Path $FintechRoot ".env.example"
if (!(Test-Path $backendEnv) -and (Test-Path $exampleEnv)) {
    Copy-Item $exampleEnv $backendEnv
    Write-Host "  - Created backend\.env from .env.example" -ForegroundColor Green
} else {
    Write-Host "  - backend\.env verified" -ForegroundColor Green
}

# Step 3: Database & Baseline Data
Write-Host "[3/6] Verifying SQLite database & seed dataset..." -ForegroundColor White
$dbFile = Join-Path $FintechRoot "data\regtech.db"
if (!(Test-Path $dbFile)) {
    Write-Host "  - Initializing clean SQLite database & seeding 14-day baseline..." -ForegroundColor Yellow
    Push-Location (Join-Path $FintechRoot "backend")
    npx tsx src/db/seed.ts
    Pop-Location
    Write-Host "  - Database seeded successfully at data\regtech.db" -ForegroundColor Green
} else {
    Write-Host "  - Database file exists at data\regtech.db" -ForegroundColor Green
}

# Step 4: ML Artifacts & Training
Write-Host "[4/6] Verifying ML anomaly detection model..." -ForegroundColor White
$modelFile = Join-Path $FintechRoot "ml_service\model.joblib"
if (!(Test-Path $modelFile)) {
    Write-Host "  - Training Isolation Forest anomaly detection model..." -ForegroundColor Yellow
    python (Join-Path $FintechRoot "ml_service\train.py")
}
Write-Host "  - Isolation Forest model ready" -ForegroundColor Green

# Step 5: Start Background Services
Write-Host "[5/6] Launching local service mesh..." -ForegroundColor White

$pidFile = Join-Path $FintechRoot ".demo_pids.json"
$pids = @{}

# 5A: Start Python ML Service (Port 5050)
Write-Host "  - Starting ML Inference Service on http://127.0.0.1:5050..." -ForegroundColor Gray
$mlProcess = Start-Process -FilePath "python.exe" -ArgumentList (Join-Path $FintechRoot "ml_service\app.py") -PassThru -WindowStyle Hidden
$pids["ml"] = $mlProcess.Id

# 5B: Start Backend API & WebSocket Server (Port 5000)
Write-Host "  - Starting Express & Socket.IO Backend on http://127.0.0.1:5000..." -ForegroundColor Gray
$backendProcess = Start-Process -FilePath "npx.cmd" -ArgumentList "tsx src/index.ts" -WorkingDirectory (Join-Path $FintechRoot "backend") -PassThru -WindowStyle Hidden
$pids["backend"] = $backendProcess.Id

# 5C: Start Frontend Vite Server (Port 5173)
Write-Host "  - Starting React Vite Frontend on http://127.0.0.1:5173..." -ForegroundColor Gray
$frontendProcess = Start-Process -FilePath "npx.cmd" -ArgumentList "vite --host 127.0.0.1 --port 5173" -WorkingDirectory (Join-Path $FintechRoot "frontend") -PassThru -WindowStyle Hidden
$pids["frontend"] = $frontendProcess.Id

$pids | ConvertTo-Json | Out-File -FilePath $pidFile -Encoding utf8

# Step 6: Readiness Verification
Write-Host "[6/6] Verifying service readiness..." -ForegroundColor White
$ready = $false
$retries = 0
while (-not $ready -and $retries -lt 15) {
    Start-Sleep -Seconds 1
    $retries++
    try {
        $backendCheck = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($backendCheck.status -eq "healthy") {
            $ready = $true
        }
    } catch {
        # wait
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  REGTECH SENTINEL SERVICES READY & OPERATIONAL!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend UI:   http://127.0.0.1:5173" -ForegroundColor Yellow
Write-Host "  Backend API:   http://127.0.0.1:5000/api" -ForegroundColor White
Write-Host "  Health Status: http://127.0.0.1:5000/api/health" -ForegroundColor White
Write-Host "  ML Service:    http://127.0.0.1:5050/health" -ForegroundColor White
Write-Host "  SQLite DB:     data\regtech.db" -ForegroundColor White
Write-Host ""
Write-Host "  To stop all services cleanly, run:" -ForegroundColor Gray
Write-Host "  .\stop-demo.ps1" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

# Automatically open browser if interactive
try {
    Start-Process "http://127.0.0.1:5173" -ErrorAction SilentlyContinue
} catch {}
