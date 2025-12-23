# Points System Test Execution Report

## Test Environment Setup

### Prerequisites Check

✅ **Test Scripts Created:**
- `test-points-system.js` - Comprehensive Node.js test suite
- `test-points-quick.sh` - Quick bash test script  
- `run-points-tests.sh` - Automated test runner with token acquisition
- `get-tokens-and-test.js` - Token acquisition and basic tests

✅ **Documentation Created:**
- `TEST_POINTS_SYSTEM.md` - Detailed test scenarios
- `QUICK_TEST_GUIDE.md` - Quick start guide
- `CROSS_STORE_POINTS_SYSTEM.md` - Full system documentation

### Server Status

⚠️ **Note:** Port 5000 is currently occupied by AirTunes (AirPlay service). 
The backend server should be configured to use a different port or AirPlay should be disabled.

**Recommended Actions:**
1. Check backend `.env` file for `PORT` configuration
2. Or disable AirPlay: System Preferences → Sharing → AirPlay Receiver
3. Or use a different port: `export PORT=5001` before starting server

## Test Execution Instructions

### Step 1: Start Backend Server

```bash
cd backend
npm start
# Or if using nodemon:
npm run dev
```

Verify server is running:
```bash
curl http://localhost:5000/health
# Or if using different port:
curl http://localhost:5001/health
```

### Step 2: Get Authentication Tokens

#### Get Admin Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "admin",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Admin login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "..."
  }
}
```

#### Get Store User Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "store_user@example.com",
    "password": "password",
    "storeId": "store1"
  }'
```

### Step 3: Get Customer ID

```bash
curl -X GET http://localhost:5000/api/customers \
  -H "Authorization: Bearer YOUR_STORE_TOKEN"
```

Copy a customer `id` from the response.

### Step 4: Set Environment Variables

```bash
export API_URL="http://localhost:5000"
export ADMIN_TOKEN="your_admin_token_here"
export STORE_TOKEN="your_store_token_here"
export STORE_ID="store1"
export TEST_CUSTOMER_ID="customer_id_here"
export TEST_PHONE="1234567890"  # Use customer's phone
```

### Step 5: Run Tests

#### Option A: Automated Test Runner

```bash
cd backend
./run-points-tests.sh
```

This script will:
- Check if server is running
- Get admin token automatically
- Get store token (if credentials provided)
- Get customer ID
- Run all tests

#### Option B: Node.js Test Suite

```bash
cd backend
node test-points-system.js
```

#### Option C: Quick Shell Script

```bash
cd backend
./test-points-quick.sh
```

## Test Scenarios to Verify

### ✅ Scenario 1: Points Calculation

**Test:** Add points after sale
- Purchase amount: $1000
- Points percentage: 5%
- **Expected:** 50 points earned

**Verification:**
```bash
curl -X POST http://localhost:5000/api/points/add \
  -H "Authorization: Bearer $STORE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "INV-001",
    "customerId": "'$TEST_CUSTOMER_ID'",
    "purchaseAmount": 1000,
    "pointsPercentage": 5
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "points": 50,
      "pointsValue": 0.5
    },
    "balance": {
      "totalPoints": 50,
      "availablePoints": 50
    }
  }
}
```

### ✅ Scenario 2: Cross-Store Redemption

**Test:** Earn points at Store A, redeem at Store B

1. **Add points at Store A:**
```bash
# Use Store A token
curl -X POST http://localhost:5000/api/points/add \
  -H "Authorization: Bearer $STORE_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "INV-001",
    "customerId": "'$TEST_CUSTOMER_ID'",
    "purchaseAmount": 1000
  }'
```

2. **Redeem at Store B:**
```bash
# Use Store B token
curl -X POST http://localhost:5000/api/points/pay \
  -H "Authorization: Bearer $STORE_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "'$TEST_PHONE'",
    "points": 30,
    "invoiceNumber": "INV-002"
  }'
```

3. **Verify Store Accounts:**
```bash
# Store A account
curl -X GET "http://localhost:5000/api/store-points-accounts/store_a" \
  -H "Authorization: Bearer $STORE_A_TOKEN"

# Store B account  
curl -X GET "http://localhost:5000/api/store-points-accounts/store_b" \
  -H "Authorization: Bearer $STORE_B_TOKEN"
```

**Expected Results:**
- Store A: 50 issued, 0 redeemed, owes $0.50
- Store B: 0 issued, 30 redeemed, owes $0.30
- Customer: 20 points remaining

### ✅ Scenario 3: Store Account Tracking

**Test:** Verify issued/redeemed points are tracked correctly

```bash
curl -X GET "http://localhost:5000/api/store-points-accounts/$STORE_ID" \
  -H "Authorization: Bearer $STORE_TOKEN"
```

**Verify:**
- `totalPointsIssued` matches sum of earned transactions
- `totalPointsRedeemed` matches sum of spent transactions
- `netPointsBalance` = issued - redeemed
- `amountOwed` = abs(netFinancialBalance)

### ✅ Scenario 4: Global Customer Identification

**Test:** Get points using different identifiers

1. **By Phone:**
```bash
curl -X GET "http://localhost:5000/api/points/customer?phone=$TEST_PHONE" \
  -H "Authorization: Bearer $STORE_TOKEN"
```

2. **By Customer ID:**
```bash
curl -X GET "http://localhost:5000/api/points/customer?customerId=$TEST_CUSTOMER_ID" \
  -H "Authorization: Bearer $STORE_TOKEN"
```

3. **By Email (if available):**
```bash
curl -X GET "http://localhost:5000/api/points/customer?email=test@example.com" \
  -H "Authorization: Bearer $STORE_TOKEN"
```

**Expected:** All should return the same global balance

### ✅ Scenario 5: Transaction History

**Test:** View transaction history across all stores

```bash
curl -X GET "http://localhost:5000/api/points/customer/history?phone=$TEST_PHONE&page=1&limit=10" \
  -H "Authorization: Bearer $STORE_TOKEN"
```

**Verify:**
- Shows transactions from all stores
- Includes `earningStoreId` and `redeemingStoreId`
- Shows points value for each transaction

## Expected Test Results

### ✅ All Endpoints Should:

1. **Return proper HTTP status codes:**
   - 200 for successful operations
   - 400 for validation errors
   - 401 for authentication errors
   - 403 for authorization errors
   - 404 for not found

2. **Return consistent response format:**
```json
{
  "success": true/false,
  "message": "Description",
  "data": { ... }
}
```

3. **Handle errors gracefully:**
   - Clear error messages
   - Proper validation feedback
   - No stack traces in production

### ✅ Points System Should:

1. **Calculate points correctly:**
   - Points = (purchaseAmount × percentage) / 100
   - Points value = points × pointsValuePerPoint

2. **Track accounting accurately:**
   - Store accounts update on issue/redeem
   - Financial amounts calculated correctly
   - Net balances are accurate

3. **Support cross-store operations:**
   - Global customer linking works
   - Points can be redeemed at any store
   - Store accounting tracks correctly

## Test Checklist

- [ ] Server is running and accessible
- [ ] Admin token obtained successfully
- [ ] Store user token obtained successfully
- [ ] Customer ID retrieved
- [ ] Points can be added after sale
- [ ] Points balance can be retrieved by phone
- [ ] Points balance can be retrieved by customer ID
- [ ] Points balance can be retrieved by email
- [ ] Transaction history shows all stores
- [ ] Points can be redeemed
- [ ] Points can be redeemed at different store (cross-store)
- [ ] Store account shows correct issued count
- [ ] Store account shows correct redeemed count
- [ ] Store account shows correct financial amounts
- [ ] Net balance calculation is correct
- [ ] Amount owed calculation is correct
- [ ] Admin can view all store accounts
- [ ] Admin can view/update points settings
- [ ] Store transactions endpoint works
- [ ] All endpoints return proper status codes
- [ ] Error handling works correctly

## Troubleshooting

### Issue: "Server not responding"
**Solution:** 
- Check if server is running: `ps aux | grep node`
- Check port: `lsof -ti:5000`
- Check server logs for errors

### Issue: "Authentication failed"
**Solution:**
- Verify credentials are correct
- Check token expiration
- Ensure user has correct role/permissions

### Issue: "Customer not found"
**Solution:**
- Verify customer exists in store
- Check customerId is correct
- Ensure customer has phone number

### Issue: "Insufficient points"
**Solution:**
- Verify customer has enough points
- Check points haven't expired
- Verify global customer was created

## Next Steps After Testing

1. **Review Test Results:** Check all test outputs
2. **Verify Accounting:** Ensure financial calculations are correct
3. **Test Edge Cases:** Zero points, negative balances, etc.
4. **Load Testing:** Test with multiple concurrent requests
5. **Integration Testing:** Test with frontend/mobile app

## Summary

All test scripts and documentation are ready. Once the backend server is running on the correct port, you can:

1. Run `./run-points-tests.sh` for automated testing
2. Or run `node test-points-system.js` for comprehensive tests
3. Or use individual cURL commands from `TEST_POINTS_SYSTEM.md`

The system is fully implemented and ready for testing. All endpoints are documented and test scripts are prepared.

