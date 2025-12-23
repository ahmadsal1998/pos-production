# Points/Loyalty System Documentation

## Overview

This document describes the points/loyalty system implementation that allows stores to reward customers with points, track store account balances, and manage thresholds for automatic account pausing.

## System Architecture

### Key Components

1. **PointsTransaction Model** - Tracks all points transactions (earned, spent, expired, adjusted)
2. **PointsBalance Model** - Maintains current points balance for each customer
3. **StoreAccount Model** - Tracks store due balances, thresholds, and account status
4. **PointsSettings Model** - Stores admin-configured percentages and thresholds

### Flow

1. **Admin** configures:
   - User points percentage (e.g., 5% of purchase becomes points)
   - Company profit percentage (e.g., 2% of purchase becomes company profit)
   - Default threshold for store accounts (e.g., 10,000)

2. **Store** completes a sale and can add points:
   - After completing a sale, store clicks "Add Points" button
   - System calculates points based on purchase amount and configured percentage
   - Points are added to customer's balance
   - Company profit is added to store's due balance

3. **Store Account Management**:
   - System tracks total earned (company profit) and total paid to store
   - When due balance reaches threshold, store account is automatically paused
   - Admin can make payments to stores to reduce due balance
   - When due balance falls below threshold, account is automatically unpaused

4. **User Points**:
   - Customers can view their points balance
   - Customers can pay with points (deducted from balance)
   - Transaction history is maintained

## API Endpoints

### Points Management (Store Operations)

#### Add Points After Sale
```
POST /api/points/add
Authorization: Bearer <token>
Body: {
  "invoiceNumber": "INV-123",
  "customerId": "customer_id",
  "purchaseAmount": 1000,
  "pointsPercentage": 5  // Optional, uses settings default if not provided
}
```

#### Get Customer Points
```
GET /api/points/customer/:customerId
Authorization: Bearer <token>
```

#### Get Customer Points History
```
GET /api/points/customer/:customerId/history?page=1&limit=20
Authorization: Bearer <token>
```

#### Pay with Points
```
POST /api/points/pay
Authorization: Bearer <token>
Body: {
  "customerId": "customer_id",
  "points": 100,
  "invoiceNumber": "INV-124",  // Optional
  "description": "Points used for payment"  // Optional
}
```

### Store Account Management (Admin Only)

#### Get All Store Accounts
```
GET /api/store-accounts
Authorization: Bearer <admin_token>
```

#### Get Single Store Account
```
GET /api/store-accounts/:id
Authorization: Bearer <token>  // Admin can view any, store users can view their own
```

#### Update Store Account Threshold
```
PUT /api/store-accounts/:storeId/threshold
Authorization: Bearer <admin_token>
Body: {
  "threshold": 15000
}
```

#### Make Payment to Store
```
POST /api/store-accounts/:storeId/payment
Authorization: Bearer <admin_token>
Body: {
  "amount": 5000,
  "description": "Monthly payment"  // Optional
}
```

#### Toggle Store Account Status
```
PATCH /api/store-accounts/:storeId/status
Authorization: Bearer <admin_token>
Body: {
  "isPaused": true,
  "reason": "Manual pause"  // Optional
}
```

### Points Settings Management (Admin Only)

#### Get Points Settings
```
GET /api/admin/points-settings?storeId=store1  // Optional storeId, defaults to global
Authorization: Bearer <admin_token>
```

#### Update Points Settings
```
PUT /api/admin/points-settings
Authorization: Bearer <admin_token>
Body: {
  "storeId": "store1",  // Optional, defaults to 'global'
  "userPointsPercentage": 5,
  "companyProfitPercentage": 2,
  "defaultThreshold": 10000,
  "pointsExpirationDays": 365,  // Optional
  "minPurchaseAmount": 100,  // Optional
  "maxPointsPerTransaction": 1000  // Optional
}
```

## Database Models

### PointsTransaction
- `storeId`: Store where transaction occurred
- `customerId`: Customer who earned/spent points
- `customerName`: Customer name for quick reference
- `invoiceNumber`: Optional invoice number if related to sale
- `transactionType`: 'earned' | 'spent' | 'expired' | 'adjusted'
- `points`: Points amount (positive for earned, negative for spent)
- `purchaseAmount`: Purchase amount that generated points
- `pointsPercentage`: Percentage used to calculate points
- `description`: Description of transaction
- `expiresAt`: Optional expiration date

### PointsBalance
- `storeId`: Store ID for multi-tenant isolation
- `customerId`: Customer ID
- `customerName`: Customer name
- `customerPhone`: Customer phone
- `totalPoints`: Total points balance
- `availablePoints`: Available points (not expired)
- `pendingPoints`: Points pending expiration
- `lifetimeEarned`: Lifetime points earned
- `lifetimeSpent`: Lifetime points spent
- `lastTransactionDate`: Date of last transaction

### StoreAccount
- `storeId`: Store ID (unique)
- `storeName`: Store name
- `totalEarned`: Total amount earned from points (company profit)
- `totalPaid`: Total amount paid to store
- `dueBalance`: Current amount due (totalEarned - totalPaid)
- `threshold`: Threshold amount (when reached, account is paused)
- `isPaused`: Whether account is paused
- `pausedAt`: Date when account was paused
- `pausedReason`: Reason for pausing
- `lastPaymentDate`: Date of last payment
- `lastPaymentAmount`: Amount of last payment

### PointsSettings
- `storeId`: 'global' for global settings, or specific storeId for store-specific
- `userPointsPercentage`: Percentage of purchase that becomes user points
- `companyProfitPercentage`: Percentage of purchase that becomes company profit
- `defaultThreshold`: Default threshold for store accounts
- `pointsExpirationDays`: Optional expiration days for points
- `minPurchaseAmount`: Optional minimum purchase to earn points
- `maxPointsPerTransaction`: Optional maximum points per transaction

## Automatic Features

### Store Account Pausing
- When a store adds points after a sale, company profit is added to the store's due balance
- If the due balance reaches or exceeds the threshold, the store account is automatically paused
- The store's `isActive` status is set to `false`
- The store cannot add more points until the account is unpaused

### Store Account Unpausing
- When admin makes a payment to a store, the due balance is reduced
- If the due balance falls below the threshold and the account was paused, it is automatically unpaused
- The store's `isActive` status is set to `true`
- The store can resume adding points

## Usage Examples

### 1. Admin Sets Up Points System

```javascript
// Set global points settings
PUT /api/admin/points-settings
{
  "userPointsPercentage": 5,
  "companyProfitPercentage": 2,
  "defaultThreshold": 10000
}
```

### 2. Store Completes Sale and Adds Points

```javascript
// After completing a sale (INV-123, $1000 purchase)
POST /api/points/add
{
  "invoiceNumber": "INV-123",
  "customerId": "customer_123",
  "purchaseAmount": 1000,
  "pointsPercentage": 5
}

// Result:
// - Customer earns 50 points (5% of $1000)
// - Store's due balance increases by $20 (2% of $1000)
// - If due balance >= threshold, store account is paused
```

### 3. Customer Views Points

```javascript
GET /api/points/customer/customer_123

// Response:
{
  "success": true,
  "data": {
    "balance": {
      "totalPoints": 150,
      "availablePoints": 150,
      "lifetimeEarned": 200,
      "lifetimeSpent": 50
    }
  }
}
```

### 4. Customer Pays with Points

```javascript
POST /api/points/pay
{
  "customerId": "customer_123",
  "points": 50,
  "invoiceNumber": "INV-124",
  "description": "Used 50 points for discount"
}
```

### 5. Admin Manages Store Accounts

```javascript
// View all store accounts
GET /api/store-accounts

// Make payment to store
POST /api/store-accounts/store1/payment
{
  "amount": 5000,
  "description": "Monthly payment"
}

// Update threshold
PUT /api/store-accounts/store1/threshold
{
  "threshold": 15000
}
```

## Integration Notes

### Frontend Integration

1. **Add Points Button**: After completing a sale, show an "Add Points" button that calls `/api/points/add`
2. **Points Display**: Show customer points balance in customer profile or POS interface
3. **Pay with Points**: Add option to pay with points during checkout
4. **Admin Dashboard**: 
   - Display store accounts with due balances
   - Show paused accounts
   - Provide interface to make payments
   - Configure points settings

### Mobile App Integration (Future)

The Flutter mobile app should:
- Display customer points balance
- Show transaction history
- Allow payment with points
- Display points expiration (if enabled)

## Security Considerations

- All endpoints require authentication
- Store operations require store access (storeId in token)
- Admin operations require admin role (userId === 'admin')
- Points transactions are immutable (cannot be deleted, only adjusted)
- Store account modifications are logged

## Error Handling

- Validation errors return 400 with detailed messages
- Insufficient points returns 400 with available points
- Store account not found returns 404
- Unauthorized access returns 403
- Server errors return 500 with error message

## Future Enhancements

1. Points expiration handling (cron job to expire points)
2. Points tiers/levels (bronze, silver, gold)
3. Referral points
4. Points redemption catalog
5. Points transfer between customers
6. Bulk points operations
7. Points analytics and reporting

