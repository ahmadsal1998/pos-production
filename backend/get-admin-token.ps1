# Quick script to get admin token manually
# This helps debug login issues

$PORT = 5001
$API_URL = "http://localhost:$PORT"

Write-Host "🔐 Admin Token Helper" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host ""

# Check for environment variables
$adminUsername = $env:ADMIN_USERNAME
$adminPassword = $env:ADMIN_PASSWORD

if ($adminUsername -and $adminPassword) {
    Write-Host "Using credentials from environment:" -ForegroundColor Yellow
    Write-Host "  Username: $adminUsername" -ForegroundColor Gray
    Write-Host ""
    
    try {
        $loginBody = @{
            emailOrUsername = $adminUsername
            password = $adminPassword
        } | ConvertTo-Json

        $loginResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
        
        if ($loginResponse.success -and $loginResponse.data.token) {
            Write-Host "✅ Token obtained!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Token:" -ForegroundColor Yellow
            Write-Host $loginResponse.data.token -ForegroundColor Gray
            Write-Host ""
            Write-Host "Set it with:" -ForegroundColor Yellow
            Write-Host "`$env:ADMIN_TOKEN = '$($loginResponse.data.token)'" -ForegroundColor Cyan
            Write-Host "`$env:API_URL = '$API_URL'" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Then run: node test-points-system.js" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Login failed: $($loginResponse.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  ADMIN_USERNAME and ADMIN_PASSWORD not set in environment" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Trying default credentials..." -ForegroundColor Yellow
    
    $credentials = @(
        @{ emailOrUsername = "admin@pos.com"; password = "password123" },
        @{ emailOrUsername = "admin"; password = "password123" }
    )
    
    foreach ($cred in $credentials) {
        Write-Host ""
        Write-Host "Trying: $($cred.emailOrUsername)..." -ForegroundColor Gray
        try {
            $loginBody = $cred | ConvertTo-Json
            $loginResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
            
            if ($loginResponse.success -and $loginResponse.data.token) {
                Write-Host "✅ Token obtained!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Token:" -ForegroundColor Yellow
                Write-Host $loginResponse.data.token -ForegroundColor Gray
                Write-Host ""
                Write-Host "Set it with:" -ForegroundColor Yellow
                Write-Host "`$env:ADMIN_TOKEN = '$($loginResponse.data.token)'" -ForegroundColor Cyan
                Write-Host "`$env:API_URL = '$API_URL'" -ForegroundColor Cyan
                exit 0
            } else {
                Write-Host "❌ Failed: $($loginResponse.message)" -ForegroundColor Red
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
            Write-Host "❌ Error: $errorMsg" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "💡 Solutions:" -ForegroundColor Yellow
    Write-Host "   1. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env file" -ForegroundColor Yellow
    Write-Host "   2. Or reset admin password in database" -ForegroundColor Yellow
    Write-Host "   3. Or use a different admin account" -ForegroundColor Yellow
}

