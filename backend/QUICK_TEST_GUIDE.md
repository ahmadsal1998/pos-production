# Quick Test Guide for Cross-Store Points System

## Prerequisites

1. **Backend server is running** on `http://localhost:5000` (or your configured port)
2. **You have valid JWT tokens** for:
   - Admin user
   - Store user (with storeId)

## Step 1: Get Your Tokens

### Get Admin Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "admin",
    "password": "your_admin_password"
  }'
```

Copy the `token` from the response.

### Get Store User Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "store_user_email",
    "password": "password",
    "storeId": "store1"
  }'
```

Copy the `token` from the response.

### Get a Customer ID

```bash
curl -X GET http://localhost:5000/api/customers \
  -H "Authorization: Bearer YOUR_STORE_TOKEN"
```

Copy a customer `id` from the response.

## Step 2: Set Environment Variables

```bash
export API_URL="http://localhost:5000"
export ADMIN_TOKEN="your_admin_token_here"
export STORE_TOKEN="your_store_token_here"
export STORE_ID="store1"
export TEST_CUSTOMER_ID="customer_id_here"
export TEST_PHONE="1234567890"  # Use a customer's phone number
```

## Step 3: Run Tests

### Option A: Quick Shell Script

```bash
cd backend
./test-points-quick.sh
```

### Option B: Node.js Test Script

```bash
cd backend
node test-points-system.js
```

### Option C: Manual cURL Tests

See `TEST_POINTS_SYSTEM.md` for detailed cURL commands.

## Test Scenarios

### Scenario 1: Basic Flow

1. **Add Points** (Store A):
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

2. **Check Balance** (by phone):
```bash
curl -X GET "http://localhost:5000/api/points/customer?phone=$TEST_PHONE" \
  -H "Authorization: Bearer $STORE_TOKEN"
```

3. **Redeem Points** (same or different store):
```bash
curl -X POST http://localhost:5000/api/points/pay \
  -H "Authorization: Bearer $STORE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "'$TEST_PHONE'",
    "points": 30,
    "invoiceNumber": "INV-002"
  }'
```

4. **Check Store Account**:
```bash
curl -X GET "http://localhost:5000/api/store-points-accounts/$STORE_ID" \
  -H "Authorization: Bearer $STORE_TOKEN"
```

### Scenario 2: Cross-Store Redemption

1. Add points at Store A (use Store A token)
2. Redeem points at Store B (use Store B token)
3. Check both store accounts to verify accounting

### Expected Results

**After adding 50 points at Store A:**
- Customer balance: 50 points
- Store A account: 50 issued, 0 redeemed, owes $0.50

**After redeeming 30 points at Store B:**
- Customer balance: 20 points
- Store A account: 50 issued, 0 redeemed, owes $0.50
- Store B account: 0 issued, 30 redeemed, owes $0.30

## Verification Checklist

- [ ] Can add points using customerId
- [ ] Can get points balance using phone number
- [ ] Can get points balance using customerId
- [ ] Can get points balance using email
- [ ] Can get transaction history
- [ ] Can redeem points using phone number
- [ ] Can redeem points at different store (cross-store)
- [ ] Store account shows correct issued/redeemed counts
- [ ] Store account shows correct financial amounts
- [ ] Admin can view all store accounts
- [ ] Admin can view/update points settings

## Troubleshooting

### "Customer not found"
- Ensure customer exists in the store
- Verify customerId is correct
- Check customer has phone number

### "Insufficient points balance"
- Verify customer has enough points
- Check points haven't expired
- Verify global customer was created

### "Access denied"
- Verify token is valid and not expired
- Check user has correct role
- Ensure storeId matches for store users

### "Store ID is required"
- Store user token must include storeId
- Check authentication middleware

## Next Steps

1. Test with multiple stores
2. Test with multiple customers
3. Verify accounting calculations
4. Test edge cases (zero points, negative balances, etc.)
5. Load test for performance

## Support

For detailed API documentation, see:
- `CROSS_STORE_POINTS_SYSTEM.md` - Full system documentation
- `TEST_POINTS_SYSTEM.md` - Detailed test scenarios

