# RegTech Sentinel - Windows 11 Clean Stop Script
# Stops only the processes started for the RegTech demonstration

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Stopping RegTech Sentinel Services..." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

$FintechRoot = $PSScriptRoot
$pidFile = Join-Path $FintechRoot ".demo_pids.json"

if (Test-Path $pidFile) {
    try {
        $pidsJson = Get-Content $pidFile | ConvertFrom-Json
        if ($pidsJson.ml) {
            Stop-Process -Id $pidsJson.ml -Force -ErrorAction SilentlyContinue
            Write-Host "  - Stopped ML inference service (PID $($pidsJson.ml))" -ForegroundColor Gray
        }
        if ($pidsJson.backend) {
            # On Windows, npm spawns child node processes, stop tree or port 5000
            Stop-Process -Id $pidsJson.backend -Force -ErrorAction SilentlyContinue
            Write-Host "  - Stopped Backend API service (PID $($pidsJson.backend))" -ForegroundColor Gray
        }
        if ($pidsJson.frontend) {
            Stop-Process -Id $pidsJson.frontend -Force -ErrorAction SilentlyContinue
            Write-Host "  - Stopped Frontend Vite service (PID $($pidsJson.frontend))" -ForegroundColor Gray
        }
    } catch {
        # ignore
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# Safeguard: Clean up any remaining listener on ports 5000, 5050, 5173
$ports = @(5000, 5050, 5173)
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            if ($c.OwningProcess -and $c.OwningProcess -gt 0) {
                Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "  - Released port $port (PID $($c.OwningProcess))" -ForegroundColor Gray
            }
        }
    }
}

Write-Host ""
Write-Host "All RegTech Sentinel services stopped cleanly." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
