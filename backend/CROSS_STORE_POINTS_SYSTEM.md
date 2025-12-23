# Cross-Store Points System Documentation

## Overview

This document describes the **global cross-store points system** that allows customers to earn points at any store and redeem them at any other store. The system implements sophisticated profit allocation logic to track financial responsibility per store.

## Key Features

1. **Global Points Balance**: Customers have one unified points balance across all stores
2. **Cross-Store Redemption**: Points earned at Store A can be redeemed at Store B
3. **Profit Allocation**: Each store is financially responsible for points it issues
4. **Comprehensive Accounting**: Tracks points issued, redeemed, and financial amounts per store

## Business Logic

### Profit Allocation Rules

1. **Stores that issue points** owe the value of unused points
   - If a store issues 1000 points and only 500 are redeemed, the store owes the value of 500 unused points

2. **Stores that redeem more points than they issued** owe the value of extra points redeemed
   - If Store A issues 500 points but Store B redeems 800 points (300 from Store A + 500 from other stores), Store B owes the value of 300 extra points

3. **Net Balance Calculation**:
   - `netPointsBalance = totalPointsIssued - totalPointsRedeemed`
   - `amountOwed = abs(netFinancialBalance)`
   - Positive balance: Store owes value of unused points
   - Negative balance: Store owes value of extra points redeemed

## Database Models

### GlobalCustomer

Links customers across all stores using phone number or email as unique identifier.

```typescript
{
  globalCustomerId: string; // Phone or email (unique)
  identifierType: 'phone' | 'email';
  name: string;
  phone?: string;
  email?: string;
  stores: Array<{
    storeId: string;
    customerId: string; // Store-specific customer ID
    customerName: string;
    registeredAt: Date;
  }>;
}
```

### PointsBalance (Global)

Single points balance per customer, not tied to any store.

```typescript
{
  globalCustomerId: string; // Unique identifier (phone/email)
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  totalPoints: number; // Global balance
  availablePoints: number;
  lifetimeEarned: number; // Across all stores
  lifetimeSpent: number; // Across all stores
}
```

### PointsTransaction

Tracks all points transactions with store information.

```typescript
{
  globalCustomerId: string;
  earningStoreId?: string; // Store where points were earned
  redeemingStoreId?: string; // Store where points were redeemed
  transactionType: 'earned' | 'spent' | 'expired' | 'adjusted';
  points: number; // Positive for earned, negative for spent
  pointsValue: number; // Monetary value of points
  invoiceNumber?: string;
  description?: string;
}
```

### StorePointsAccount

Tracks points accounting per store for financial reporting.

```typescript
{
  storeId: string; // Unique
  storeName: string;
  
  // Points tracking
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  netPointsBalance: number; // issued - redeemed
  
  // Financial tracking
  pointsValuePerPoint: number; // e.g., 0.01 = $0.01 per point
  totalPointsValueIssued: number;
  totalPointsValueRedeemed: number;
  netFinancialBalance: number; // value issued - value redeemed
  amountOwed: number; // Always positive, abs(netFinancialBalance)
}
```

## API Endpoints

### Points Management

#### Add Points After Sale
```
POST /api/points/add
Authorization: Bearer <token>
Body: {
  "invoiceNumber": "INV-123",
  "customerId": "store_customer_id",
  "purchaseAmount": 1000,
  "pointsPercentage": 5  // Optional
}
```

**Response:**
- Creates/updates global customer
- Adds points to global balance
- Updates store's points account (issued)
- Returns transaction and updated balance

#### Get Customer Points (Global)
```
GET /api/points/customer?customerId=xxx
GET /api/points/customer?globalCustomerId=phone_or_email
GET /api/points/customer?phone=1234567890
GET /api/points/customer?email=user@example.com
```

**Response:**
- Returns global points balance (works from any store)

#### Get Customer Points History (Global)
```
GET /api/points/customer/history?customerId=xxx&page=1&limit=20
GET /api/points/customer/history?phone=1234567890&page=1&limit=20
```

**Response:**
- Returns all transactions across all stores

#### Pay with Points (Cross-Store)
```
POST /api/points/pay
Authorization: Bearer <token>
Body: {
  "customerId": "store_customer_id",  // OR
  "globalCustomerId": "phone_or_email",  // OR
  "phone": "1234567890",  // OR
  "email": "user@example.com",
  "points": 100,
  "invoiceNumber": "INV-124",
  "description": "Points used for payment"
}
```

**Response:**
- Deducts points from global balance
- Updates redeeming store's points account (redeemed)
- Returns transaction and updated balance

### Store Points Accounting

#### Get Store Points Account
```
GET /api/store-points-accounts/:storeId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "account": {
      "storeId": "store1",
      "storeName": "Store 1",
      "totalPointsIssued": 10000,
      "totalPointsRedeemed": 3000,
      "netPointsBalance": 7000,
      "pointsValuePerPoint": 0.01,
      "totalPointsValueIssued": 100.00,
      "totalPointsValueRedeemed": 30.00,
      "netFinancialBalance": 70.00,
      "amountOwed": 70.00
    }
  }
}
```

#### Get All Store Points Accounts (Admin)
```
GET /api/store-points-accounts
Authorization: Bearer <admin_token>
```

#### Get Store Points Transactions
```
GET /api/store-points-accounts/:storeId/transactions?page=1&limit=50&transactionType=earned&startDate=2024-01-01&endDate=2024-12-31
```

**Response:**
- Returns transactions where store earned or redeemed points
- Includes summary with totals

### Points Settings

#### Update Points Settings
```
PUT /api/admin/points-settings
Authorization: Bearer <admin_token>
Body: {
  "storeId": "store1",  // Optional, defaults to 'global'
  "userPointsPercentage": 5,
  "companyProfitPercentage": 2,
  "defaultThreshold": 10000,
  "pointsValuePerPoint": 0.01,  // NEW: Value of 1 point
  "pointsExpirationDays": 365,
  "minPurchaseAmount": 100,
  "maxPointsPerTransaction": 1000
}
```

## Usage Examples

### Example 1: Customer Earns Points at Store A

```javascript
// Store A completes sale
POST /api/points/add
{
  "invoiceNumber": "INV-001",
  "customerId": "customer_123",
  "purchaseAmount": 1000
}

// Result:
// - Customer earns 50 points (5% of $1000)
// - Points added to global balance
// - Store A's account: totalPointsIssued += 50
// - Store A's account: totalPointsValueIssued += $0.50 (50 * $0.01)
```

### Example 2: Customer Redeems Points at Store B

```javascript
// Store B allows customer to pay with points
POST /api/points/pay
{
  "phone": "1234567890",
  "points": 30,
  "invoiceNumber": "INV-002"
}

// Result:
// - 30 points deducted from global balance
// - Store B's account: totalPointsRedeemed += 30
// - Store B's account: totalPointsValueRedeemed += $0.30
// - If Store B issued 0 points but redeemed 30:
//   - netPointsBalance = -30
//   - amountOwed = $0.30 (Store B owes for extra points redeemed)
```

### Example 3: Financial Summary

**Store A:**
- Issued: 1000 points ($10.00)
- Redeemed: 200 points ($2.00)
- Net: 800 points ($8.00)
- **Amount Owed: $8.00** (value of unused points)

**Store B:**
- Issued: 500 points ($5.00)
- Redeemed: 800 points ($8.00)
- Net: -300 points (-$3.00)
- **Amount Owed: $3.00** (value of extra points redeemed)

## Migration Notes

### From Store-Specific to Global

1. **Existing Data**: Points balances are currently store-specific
2. **Migration Strategy**:
   - Create GlobalCustomer records for existing customers
   - Merge store-specific points balances into global balances
   - Update transactions with earningStoreId/redeemingStoreId
   - Initialize StorePointsAccount from historical transactions

3. **Backward Compatibility**: 
   - API accepts both `customerId` (store-specific) and `globalCustomerId`/`phone`/`email`
   - System automatically creates/links global customer when needed

## Integration Guide

### Frontend Integration

1. **Add Points Button**: After sale completion, call `/api/points/add` with store customer ID
2. **Points Display**: Use `/api/points/customer?phone=xxx` to show global balance
3. **Pay with Points**: Call `/api/points/pay` with phone/email (works from any store)
4. **Transaction History**: Show all transactions across stores

### Mobile App Integration

1. **Customer Identification**: Use phone number as primary identifier
2. **Points Balance**: Display global balance (not store-specific)
3. **Transaction History**: Show all transactions with store names
4. **Redeem Points**: Allow redemption at any store

## Security Considerations

- All endpoints require authentication
- Store operations require store access
- Admin operations require admin role
- Global customer linking is automatic and secure
- Points transactions are immutable (cannot be deleted)

## Accounting Reports

### Per-Store Report

Shows for each store:
- Total points issued
- Total points redeemed
- Net points balance
- Financial amounts (issued value, redeemed value, amount owed)

### System-Wide Report

Shows:
- Total points in circulation
- Total points value issued
- Total points value redeemed
- Net system balance
- Stores with highest amounts owed

## Future Enhancements

1. Points expiration handling (cron job)
2. Points transfer between customers
3. Points tiers/levels
4. Referral points
5. Bulk operations
6. Advanced analytics and reporting

