# Complete setup and test script
# This will seed the database if needed and then run tests

$PORT = 5001
$API_URL = "http://localhost:$PORT"

# Load .env file if it exists
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)\s*$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            if (-not [string]::IsNullOrEmpty($key) -and -not [string]::IsNullOrEmpty($value)) {
                [Environment]::SetEnvironmentVariable($key, $value, "Process")
            }
        }
    }
}

Write-Host "🚀 Points System - Complete Setup & Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if server is running
Write-Host "📡 Checking server..." -ForegroundColor Blue
try {
    $healthResponse = Invoke-WebRequest -Uri "$API_URL/health" -Method GET -TimeoutSec 3 -ErrorAction Stop
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✅ Server is running" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Server is not running on port $PORT" -ForegroundColor Red
    Write-Host "💡 Please start the server first: npm start" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 2: Try to get admin token
Write-Host "🔐 Getting admin token..." -ForegroundColor Blue

# Check for ADMIN_USERNAME and ADMIN_PASSWORD in environment
$adminUsername = $env:ADMIN_USERNAME
$adminPassword = $env:ADMIN_PASSWORD

# Build credentials list - try env vars first, then defaults
$credentials = @()
if ($adminUsername -and $adminPassword) {
    $credentials += @{ emailOrUsername = $adminUsername; password = $adminPassword }
    Write-Host "   Using ADMIN_USERNAME from environment: $adminUsername" -ForegroundColor Gray
}
$credentials += @(
    @{ emailOrUsername = "admin@pos.com"; password = "password123" },
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
        # Continue to next credential
    }
}

# Step 3: If no token, try to seed database
if (-not $adminToken) {
    Write-Host ""
    Write-Host "⚠️  Admin user not found. Seeding database..." -ForegroundColor Yellow
    Write-Host "   Running: npm run seed" -ForegroundColor Gray
    
    npm run seed
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database seeded successfully" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔐 Retrying admin login..." -ForegroundColor Blue
        
        # Try again after seeding
        Start-Sleep -Seconds 2  # Give server a moment
        foreach ($cred in $credentials) {
            try {
                Write-Host "   Retrying: $($cred.emailOrUsername)..." -ForegroundColor Gray
                $loginBody = $cred | ConvertTo-Json
                $loginResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
                
                if ($loginResponse.success -and $loginResponse.data.token) {
                    $adminToken = $loginResponse.data.token
                    Write-Host "✅ Admin token obtained!" -ForegroundColor Green
                    break
                } else {
                    Write-Host "   Response: $($loginResponse.message)" -ForegroundColor Yellow
                }
            } catch {
                $errorMsg = $_.Exception.Message
                if ($_.Exception.Response) {
                    try {
                        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                        $responseBody = $reader.ReadToEnd()
                        $errorJson = $responseBody | ConvertFrom-Json
                        $errorMsg = $errorJson.message
                    } catch {
                        $errorMsg = $responseBody
                    }
                }
                Write-Host "   Error: $errorMsg" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "❌ Database seeding failed" -ForegroundColor Red
        Write-Host "💡 Please run manually: npm run seed" -ForegroundColor Yellow
    }
}

# Step 4: Run tests if we have a token
if ($adminToken) {
    Write-Host ""
    Write-Host "🧪 Running tests..." -ForegroundColor Cyan
    Write-Host ""
    
    $env:ADMIN_TOKEN = $adminToken
    $env:API_URL = $API_URL
    
    node test-points-system.js
    $testExitCode = $LASTEXITCODE
} else {
    Write-Host ""
    Write-Host "❌ Cannot proceed without admin token" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solutions:" -ForegroundColor Yellow
    Write-Host "   1. Run: npm run seed" -ForegroundColor Yellow
    Write-Host "   2. Or set ADMIN_USERNAME and ADMIN_PASSWORD in .env" -ForegroundColor Yellow
    Write-Host "   3. Or manually get token and set: `$env:ADMIN_TOKEN = 'your_token'" -ForegroundColor Yellow
    $testExitCode = 1
}

exit $testExitCode

