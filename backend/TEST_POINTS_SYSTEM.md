# Testing Guide for Cross-Store Points System

## Quick Start

### 1. Set Environment Variables

Create a `.env.test` file or export variables:

```bash
export API_URL="http://localhost:5000"
export ADMIN_TOKEN="your_admin_jwt_token"
export STORE_TOKEN="your_store_user_jwt_token"
export STORE_ID="store1"
export TEST_CUSTOMER_ID="customer_mongodb_id"
export TEST_PHONE="1234567890"
export TEST_EMAIL="test@example.com"
```

### 2. Run the Test Script

```bash
cd backend
node test-points-system.js
```

## Manual Testing with cURL

### Prerequisites

1. **Get Admin Token**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "admin",
    "password": "your_admin_password"
  }'
```

2. **Get Store User Token**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "store_user",
    "password": "password",
    "storeId": "store1"
  }'
```

3. **Get Customer ID**:
```bash
curl -X GET http://localhost:5000/api/customers \
  -H "Authorization: Bearer YOUR_STORE_TOKEN"
```

### Test Scenarios

#### Scenario 1: Add Points at Store A

```bash
curl -X POST http://localhost:5000/api/points/add \
  -H "Authorization: Bearer YOUR_STORE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "INV-001",
    "customerId": "CUSTOMER_ID",
    "purchaseAmount": 1000,
    "pointsPercentage": 5
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Points added successfully",
  "data": {
    "transaction": {
      "id": "...",
      "points": 50,
      "purchaseAmount": 1000,
      "pointsPercentage": 5,
      "pointsValue": 0.5
    },
    "balance": {
      "totalPoints": 50,
      "availablePoints": 50
    }
  }
}
```

#### Scenario 2: Get Customer Points by Phone

```bash
curl -X GET "http://localhost:5000/api/points/customer?phone=1234567890" \
  -H "Authorization: Bearer YOUR_STORE_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "balance": {
      "id": "...",
      "globalCustomerId": "1234567890",
      "customerName": "Customer Name",
      "totalPoints": 50,
      "availablePoints": 50,
      "lifetimeEarned": 50,
      "lifetimeSpent": 0
    }
  }
}
```

#### Scenario 3: Get Customer Points by Customer ID

```bash
curl -X GET "http://localhost:5000/api/points/customer?customerId=CUSTOMER_ID" \
  -H "Authorization: Bearer YOUR_STORE_TOKEN"
```

#### Scenario 4: Get Customer Points History

```bash
curl -X GET "http://localhost:5000/api/points/customer/history?phone=1234567890&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_STORE_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "...",
        "globalCustomerId": "1234567890",
        "earningStoreId": "store1",
        "transactionType": "earned",
        "points": 50,
        "pointsValue": 0.5,
        "invoiceNumber": "INV-001"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### Scenario 5: Redeem Points at Store B (Cross-Store)

```bash
curl -X POST http://localhost:5000/api/points/pay \
  -H "Authorization: Bearer YOUR_STORE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "1234567890",
    "points": 30,
    "invoiceNumber": "INV-002",
    "description": "Points redeemed at Store B"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Points deducted successfully",
  "data": {
    "transaction": {
      "id": "...",
      "points": -30,
      "pointsValue": 0.3
    },
    "balance": {
      "totalPoints": 20,
      "availablePoints": 20
    }
  }
}
```

#### Scenario 6: Get Store Points Account

```bash
curl -X GET http://localhost:5000/api/store-points-accounts/store1 \
  -H "Authorization: Bearer YOUR_STORE_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "...",
      "storeId": "store1",
      "storeName": "Store 1",
      "totalPointsIssued": 50,
      "totalPointsRedeemed": 0,
      "netPointsBalance": 50,
      "pointsValuePerPoint": 0.01,
      "totalPointsValueIssued": 0.5,
      "totalPointsValueRedeemed": 0,
      "netFinancialBalance": 0.5,
      "amountOwed": 0.5
    }
  }
}
```

#### Scenario 7: Get All Store Points Accounts (Admin)

```bash
curl -X GET http://localhost:5000/api/store-points-accounts \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Scenario 8: Get Store Points Transactions

```bash
curl -X GET "http://localhost:5000/api/store-points-accounts/store1/transactions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_STORE_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "summary": {
      "totalIssued": 50,
      "totalRedeemed": 30,
      "netPointsBalance": 20,
      "totalIssuedValue": 0.5,
      "totalRedeemedValue": 0.3,
      "netFinancialBalance": 0.2,
      "amountOwed": 0.2
    },
    "pagination": {...}
  }
}
```

#### Scenario 9: Get Points Settings (Admin)

```bash
curl -X GET http://localhost:5000/api/admin/points-settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Scenario 10: Update Points Settings (Admin)

```bash
curl -X PUT http://localhost:5000/api/admin/points-settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userPointsPercentage": 5,
    "companyProfitPercentage": 2,
    "defaultThreshold": 10000,
    "pointsValuePerPoint": 0.01
  }'
```

## Complete Test Flow

### End-to-End Test: Cross-Store Points Flow

1. **Setup**: Create a customer at Store A
2. **Earn Points**: Add points at Store A (50 points)
3. **Verify Balance**: Check points balance using phone number
4. **Redeem at Store B**: Use 30 points at Store B
5. **Verify Accounting**: 
   - Store A account shows 50 issued, 0 redeemed → owes $0.50
   - Store B account shows 0 issued, 30 redeemed → owes $0.30
6. **Check History**: Verify transaction history shows both stores

### Expected Results

**Store A Account:**
- `totalPointsIssued`: 50
- `totalPointsRedeemed`: 0
- `netPointsBalance`: 50
- `amountOwed`: $0.50 (value of unused points)

**Store B Account:**
- `totalPointsIssued`: 0
- `totalPointsRedeemed`: 30
- `netPointsBalance`: -30
- `amountOwed`: $0.30 (value of extra points redeemed)

**Customer Balance:**
- `totalPoints`: 20 (50 - 30)
- `availablePoints`: 20

## Troubleshooting

### Common Issues

1. **"Customer not found"**
   - Ensure customer exists in the store
   - Check customerId is correct

2. **"Insufficient points balance"**
   - Verify customer has enough points
   - Check points haven't expired

3. **"Access denied"**
   - Verify token is valid
   - Check user has correct role (Admin for admin endpoints)

4. **"Store ID is required"**
   - Ensure store user token includes storeId
   - Check authentication middleware

### Debug Tips

1. Check server logs for detailed error messages
2. Verify database collections exist:
   - `globalcustomers`
   - `pointsbalances`
   - `pointstransactions`
   - `storepointsaccounts`

3. Verify indexes are created (check MongoDB)

4. Test with Postman or similar tool for better debugging

## Test Checklist

- [ ] Add points at Store A
- [ ] Get customer points by phone
- [ ] Get customer points by customer ID
- [ ] Get customer points by email
- [ ] Get customer points history
- [ ] Redeem points at Store A
- [ ] Redeem points at Store B (cross-store)
- [ ] Get Store A points account
- [ ] Get Store B points account
- [ ] Verify accounting calculations
- [ ] Get all store accounts (Admin)
- [ ] Get store transactions
- [ ] Update points settings (Admin)
- [ ] Verify global customer linking

## Performance Testing

For load testing, consider:

1. **Concurrent Points Addition**: Test multiple stores adding points simultaneously
2. **Cross-Store Redemption**: Test high volume of cross-store redemptions
3. **Account Queries**: Test querying accounts with many transactions
4. **Global Customer Lookup**: Test phone/email lookup performance

Use tools like Apache Bench or k6 for load testing:

```bash
# Example: 100 requests, 10 concurrent
ab -n 100 -c 10 -H "Authorization: Bearer TOKEN" \
  "http://localhost:5000/api/points/customer?phone=1234567890"
```

