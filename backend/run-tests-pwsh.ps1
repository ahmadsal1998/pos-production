# PowerShell Test Script for Cross-Store Points System
# This script will start the server and run tests

$ErrorActionPreference = "Stop"

Write-Host "🚀 Cross-Store Points System Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
# Check for PORT in .env or use default
$PORT = if ($env:PORT) { $env:PORT } else { 
    # Try to read from .env file
    if (Test-Path ".env") {
        $envContent = Get-Content ".env" | Where-Object { $_ -match "^PORT=" }
        if ($envContent) {
            ($envContent -split "=")[1].Trim()
        } else {
            "5000"
        }
    } else {
        "5000"
    }
}

$API_URL = if ($env:API_URL) { $env:API_URL } else { "http://localhost:$PORT" }
$ADMIN_USERNAME = if ($env:ADMIN_USERNAME) { $env:ADMIN_USERNAME } else { "admin" }
$ADMIN_PASSWORD = if ($env:ADMIN_PASSWORD) { $env:ADMIN_PASSWORD } else { "password123" }

Write-Host "API URL: $API_URL" -ForegroundColor Yellow
Write-Host "Port: $PORT" -ForegroundColor Yellow
Write-Host ""

# Check if port is already in use
Write-Host "📡 Checking if server is running..." -ForegroundColor Blue
$portInUse = $false
try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $PORT)
    $listener.Start()
    $listener.Stop()
} catch {
    $portInUse = $true
    Write-Host "⚠️  Port $PORT is already in use" -ForegroundColor Yellow
}

# Try to connect to health endpoint
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "$API_URL/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Server is already running on port $PORT" -ForegroundColor Green
        $serverRunning = $true
    }
} catch {
    if ($portInUse) {
        Write-Host "⚠️  Port $PORT is in use but server may not be responding" -ForegroundColor Yellow
        Write-Host "💡 Trying to use existing server..." -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  Server is not running" -ForegroundColor Yellow
    }
}

# Start server if not running
if (-not $serverRunning) {
    if ($portInUse) {
        Write-Host ""
        Write-Host "⚠️  Port $PORT is already in use." -ForegroundColor Yellow
        Write-Host "💡 Attempting to use existing server..." -ForegroundColor Yellow
        
        # Try a few more times to see if server responds
        $maxAttempts = 5
        $attempt = 0
        while ($attempt -lt $maxAttempts -and -not $serverRunning) {
            Start-Sleep -Seconds 2
            $attempt++
            try {
                $response = Invoke-WebRequest -Uri "$API_URL/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $serverRunning = $true
                    Write-Host "✅ Found existing server!" -ForegroundColor Green
                }
            } catch {
                Write-Host "." -NoNewline -ForegroundColor Gray
            }
        }
        
        if (-not $serverRunning) {
            Write-Host ""
            Write-Host "❌ Cannot connect to server on port $PORT" -ForegroundColor Red
            Write-Host "💡 Please either:" -ForegroundColor Yellow
            Write-Host "   1. Stop the process using port $PORT" -ForegroundColor Yellow
            Write-Host "   2. Or start the server manually: npm start" -ForegroundColor Yellow
            Write-Host "   3. Or use a different port: `$env:PORT = '5002'" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host ""
        Write-Host "🚀 Starting backend server..." -ForegroundColor Blue
        
        # Check if dist folder exists
        if (-not (Test-Path "dist")) {
            Write-Host "⚠️  dist folder not found. Building project..." -ForegroundColor Yellow
            Write-Host "Running: npm run build" -ForegroundColor Gray
            npm run build
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Build failed. Please run 'npm run build' manually." -ForegroundColor Red
                exit 1
            }
        }
        
        # Start server in background
        Write-Host "Starting server process..." -ForegroundColor Gray
        $serverProcess = Start-Process -FilePath "node" -ArgumentList "dist/index.js" -PassThru -NoNewWindow
        
        Write-Host "Waiting for server to start..." -ForegroundColor Gray
        $maxAttempts = 30
        $attempt = 0
        $serverReady = $false
        
        while ($attempt -lt $maxAttempts -and -not $serverReady) {
            Start-Sleep -Seconds 1
            $attempt++
            try {
                $response = Invoke-WebRequest -Uri "$API_URL/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $serverReady = $true
                    Write-Host "✅ Server is ready!" -ForegroundColor Green
                }
            } catch {
                Write-Host "." -NoNewline -ForegroundColor Gray
            }
        }
        
        if (-not $serverReady) {
            Write-Host ""
            Write-Host "❌ Server failed to start. Please check logs." -ForegroundColor Red
            if ($serverProcess) {
                Stop-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue
            }
            exit 1
        }
        
        Write-Host ""
    }
}

# Get Admin Token
Write-Host ""
Write-Host "🔐 Getting admin token..." -ForegroundColor Blue
try {
    $loginBody = @{
        emailOrUsername = $ADMIN_USERNAME
        password = $ADMIN_PASSWORD
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    
    if ($loginResponse.success -and $loginResponse.data.token) {
        $ADMIN_TOKEN = $loginResponse.data.token
        Write-Host "✅ Admin token obtained" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to get admin token" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error getting admin token: $_" -ForegroundColor Red
    exit 1
}

# Set environment variables for test script
$env:ADMIN_TOKEN = $ADMIN_TOKEN
$env:API_URL = $API_URL

Write-Host ""
Write-Host "🧪 Running tests..." -ForegroundColor Blue
Write-Host ""

# Run Node.js test script
if (Test-Path "test-points-system.js") {
    node test-points-system.js
    $testExitCode = $LASTEXITCODE
} else {
    Write-Host "❌ test-points-system.js not found" -ForegroundColor Red
    $testExitCode = 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($testExitCode -eq 0) {
    Write-Host "✅ All tests completed!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests may have failed. Review output above." -ForegroundColor Yellow
}

# Cleanup: Stop server if we started it
if (-not $serverRunning -and $serverProcess) {
    Write-Host ""
    Write-Host "🛑 Stopping server..." -ForegroundColor Gray
    Stop-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue
    Write-Host "✅ Server stopped" -ForegroundColor Green
}

exit $testExitCode

