# Quick script to check server and run tests
# This handles the port 5001 issue

$PORT = 5001  # Based on server logs
$API_URL = "http://localhost:$PORT"

Write-Host "🔍 Checking server on port $PORT..." -ForegroundColor Cyan

# Check if server is responding
$serverRunning = $false
try {
    $healthResponse = Invoke-WebRequest -Uri "$API_URL/health" -Method GET -TimeoutSec 3 -ErrorAction Stop
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✅ Server is running on port $PORT" -ForegroundColor Green
        $serverRunning = $true
    }
} catch {
    Write-Host "❌ Server is not responding on port $PORT" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "💡 Please start the server first: npm start" -ForegroundColor Yellow
    exit 1
}

if ($serverRunning) {
    Write-Host ""
    
        # Get admin token - try different credential options
        Write-Host "🔐 Getting admin token..." -ForegroundColor Cyan
        
        # Try adminn@pos.com first (from seed script)
        $credentials = @(
            @{ emailOrUsername = "adminn@pos.com"; password = "password123" },
            @{ emailOrUsername = "admin"; password = "password123" }
        )
        
        $adminToken = $null
        foreach ($cred in $credentials) {
            try {
                Write-Host "   Trying: $($cred.emailOrUsername)..." -ForegroundColor Gray
                $loginBody = $cred | ConvertTo-Json
                $loginResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
                
                if ($loginResponse.success -and $loginResponse.data.token) {
                    $adminToken = $loginResponse.data.token
                    Write-Host "✅ Admin token obtained!" -ForegroundColor Green
                    break
                }
            } catch {
                # Try next credential
            }
        }
        
        if (-not $adminToken) {
            Write-Host "❌ Could not get admin token" -ForegroundColor Red
            Write-Host "💡 Try running: npm run seed" -ForegroundColor Yellow
            Write-Host "   Or set ADMIN_USERNAME and ADMIN_PASSWORD in .env" -ForegroundColor Yellow
            exit 1
        }
        
        try {
        
            $env:ADMIN_TOKEN = $adminToken
            $env:API_URL = $API_URL
            
            # Run tests
            Write-Host ""
            Write-Host "🧪 Running tests..." -ForegroundColor Cyan
            Write-Host ""
            node test-points-system.js
    } catch {
        Write-Host "❌ Error getting admin token: $_" -ForegroundColor Red
        Write-Host "💡 Check if admin credentials are correct" -ForegroundColor Yellow
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
        }
    }
}

