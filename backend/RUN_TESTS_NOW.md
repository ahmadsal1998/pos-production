# Run Tests Now - Quick Instructions

Since you're in PowerShell, run this command:

```powershell
.\setup-and-test.ps1
```

This script will:
1. ✅ Check if server is running on port 5001
2. ✅ Try to get admin token
3. ✅ Seed database if admin user doesn't exist
4. ✅ Get admin token after seeding
5. ✅ Run all points system tests

## What to Expect

The script will:
- Show server status
- Attempt login with `admin@pos.com` / `password123`
- If that fails, run `npm run seed` to create the admin user
- Retry login after seeding
- Run the comprehensive test suite

## Test Results

After running, you'll see:
- ✅ Passed tests
- ❌ Failed tests  
- ⚠️ Skipped tests (if store token/customer ID not available)

## If Tests Fail

Common issues:
1. **No store token** - Some tests require a store user token
2. **No customer ID** - Some tests require an existing customer
3. **Server not running** - Make sure server is on port 5001

The script handles the admin token automatically, but you may need to provide:
- `$env:STORE_TOKEN` - Store user token
- `$env:STORE_ID` - Store ID
- `$env:TEST_CUSTOMER_ID` - Customer ID for testing

