# Quick Start Test Guide

## For PowerShell Users

Since you're using PowerShell, use the PowerShell test script:

```powershell
cd backend
.\run-tests-pwsh.ps1
```

This script will:
1. ✅ Check if server is running
2. ✅ Build the project if needed
3. ✅ Start the server automatically
4. ✅ Get admin token
5. ✅ Run all tests
6. ✅ Clean up (stop server if it started it)

## Manual Steps (Alternative)

### Step 1: Build the Project

```powershell
cd backend
npm run build
```

### Step 2: Start the Server

```powershell
npm start
```

Or in a separate terminal:
```powershell
npm run dev
```

### Step 3: Run Tests

In another terminal:
```powershell
cd backend
.\run-points-tests.sh
```

Or use Node.js directly:
```powershell
node test-points-system.js
```

## Environment Variables

Set these before running tests:

```powershell
$env:API_URL = "http://localhost:5000"
$env:ADMIN_USERNAME = "admin"
$env:ADMIN_PASSWORD = "password123"
$env:STORE_TOKEN = "your_store_token"
$env:STORE_ID = "store1"
$env:TEST_CUSTOMER_ID = "customer_id"
$env:TEST_PHONE = "1234567890"
```

## Troubleshooting

### "dist folder not found"
Run: `npm run build`

### "Server not responding"
- Check if port 5000 is available
- Check server logs for errors
- Try a different port: `$env:PORT = "5001"`

### "Cannot get admin token"
- Verify ADMIN_USERNAME and ADMIN_PASSWORD
- Check if admin user exists in database
- Run seed script: `npm run seed`

