# Test script that tries multiple admin credential options

$PORT = 5001
$API_URL = "http://localhost:$PORT"

Write-Host "🔍 Testing Points System" -ForegroundColor Cyan
Write-Host "API URL: $API_URL" -ForegroundColor Yellow
Write-Host ""

# Try different admin credential combinations
$credentials = @(
    @{ emailOrUsername = "admin"; password = "password123" },
    @{ emailOrUsername = "adminn@pos.com"; password = "password123" },
    @{ emailOrUsername = "admin"; password = "admin" },
    @{ emailOrUsername = "admin"; password = "password" }
)

$adminToken = $null

foreach ($cred in $credentials) {
    Write-Host "🔐 Trying: $($cred.emailOrUsername) / $($cred.password)" -ForegroundColor Gray
    try {
        $loginBody = $cred | ConvertTo-Json
        $loginResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
        
        if ($loginResponse.success -and $loginResponse.data.token) {
            $adminToken = $loginResponse.data.token
            Write-Host "✅ Admin token obtained!" -ForegroundColor Green
            Write-Host "   Username: $($cred.emailOrUsername)" -ForegroundColor Green
            break
        }
    } catch {
        $errorMsg = $_.Exception.Message
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            try {
                $errorJson = $responseBody | ConvertFrom-Json
                $errorMsg = $errorJson.message
            } catch {
                $errorMsg = $responseBody
            }
        }
        Write-Host "   ❌ $errorMsg" -ForegroundColor Red
    }
}

if (-not $adminToken) {
    Write-Host ""
    Write-Host "❌ Could not get admin token with any credentials" -ForegroundColor Red
    Write-Host "💡 Please check:" -ForegroundColor Yellow
    Write-Host "   1. ADMIN_USERNAME and ADMIN_PASSWORD in .env file" -ForegroundColor Yellow
    Write-Host "   2. Or create admin user: npm run seed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can also manually get a token and set it:" -ForegroundColor Yellow
    Write-Host '   $env:ADMIN_TOKEN = "your_token_here"' -ForegroundColor Gray
    Write-Host '   $env:API_URL = "http://localhost:5001"' -ForegroundColor Gray
    Write-Host '   node test-points-system.js' -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "🧪 Running tests..." -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:ADMIN_TOKEN = $adminToken
$env:API_URL = $API_URL

# Run tests
node test-points-system.js

