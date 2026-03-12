# Frenzee - start all servers
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Starting Frenzee..."

# Kill leftover processes on ports 4000, 3000, 3001
Write-Host "Clearing ports 4000, 3000, 3001..."
foreach ($port in @(4000, 3000, 3001)) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $connections.OwningProcess | Sort-Object -Unique | ForEach-Object {
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        }
    }
}
Start-Sleep -Seconds 2

# Start backend
Write-Host "Starting backend on :4000 ..."
$backend = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "$ROOT\backend" -PassThru -NoNewWindow

Start-Sleep -Seconds 1

# Start frontend
Write-Host "Starting frontend on :3001 ..."
$frontend = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev", "--", "-p", "3001" -WorkingDirectory "$ROOT\frontend" -PassThru -NoNewWindow

Write-Host ""
Write-Host "Frenzee is live!"
Write-Host "   Frontend -> http://localhost:3001"
Write-Host "   Backend  -> http://localhost:4000"
Write-Host ""
Write-Host "Press Ctrl+C to stop everything."

try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    Write-Host "Stopping..."
    foreach ($port in @(4000, 3000, 3001)) {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            $connections.OwningProcess | Sort-Object -Unique | ForEach-Object {
                Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
            }
        }
    }
    Write-Host "Stopped."
}
