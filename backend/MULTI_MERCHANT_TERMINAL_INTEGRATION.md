# Multi-Merchant VX990 Terminal Integration

This document describes the multi-merchant and multi-terminal integration for the Verifone VX990 payment terminal system.

## Overview

The system now supports multiple merchants, each with one or more payment terminals. This allows:

- Multiple merchants in the same POS system
- Each merchant having multiple terminals
- Automatic routing of payments to the correct terminal
- Per-terminal test mode configuration
- Complete transaction isolation between merchants

## Architecture

### Database Models

1. **Merchant Model** (`src/models/Merchant.ts`)
   - Stores merchant information
   - Links to stores (optional)
   - Contains Merchant ID (MID) for payment processing

2. **Terminal Model** (`src/models/Terminal.ts`)
   - Links to a merchant (one-to-many relationship)
   - Stores terminal configuration (IP, port, connection type)
   - Contains Terminal ID (TID)
   - Supports per-terminal test mode
   - Tracks connection status and errors

3. **Payment Model** (Updated)
   - Links to both merchant and terminal
   - Stores complete transaction audit trail

### Key Features

- **Merchant-Terminal Mapping**: Each merchant can have multiple terminals
- **Automatic Routing**: Payments are automatically routed to the correct terminal based on merchant
- **Store Association**: Merchants can be associated with stores for multi-store support
- **Test Mode**: Each terminal can be configured independently for test mode
- **Transaction Isolation**: Complete separation of transactions per merchant
- **Connection Management**: Automatic connection handling per terminal

## Setup

### 1. Create a Merchant

First, create a merchant in the system:

**POST** `/api/merchants`

```json
{
  "name": "Main Store Merchant",
  "merchantId": "MERCHANT001",
  "storeId": "store1",
  "description": "Primary merchant for main store",
  "status": "Active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Merchant created successfully",
  "data": {
    "merchant": {
      "id": "...",
      "name": "Main Store Merchant",
      "merchantId": "MERCHANT001",
      "storeId": "store1",
      "status": "Active",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

### 2. Create a Terminal for the Merchant

Next, create one or more terminals for the merchant:

**POST** `/api/terminals`

```json
{
  "merchantId": "MERCHANT_ID_FROM_STEP_1",
  "terminalId": "TERMINAL001",
  "name": "Counter Terminal 1",
  "host": "192.168.1.100",
  "port": 12000,
  "connectionType": "ethernet",
  "status": "Active",
  "testMode": false,
  "timeout": 60000,
  "description": "Main counter terminal"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Terminal created successfully",
  "data": {
    "terminal": {
      "id": "...",
      "merchantId": "...",
      "terminalId": "TERMINAL001",
      "name": "Counter Terminal 1",
      "host": "192.168.1.100",
      "port": 12000,
      "connectionType": "ethernet",
      "status": "Active",
      "testMode": false,
      "timeout": 60000
    }
  }
}
```

### 3. Test Terminal Connection

Before going live, test the terminal connection:

**POST** `/api/terminals/:id/test`

**Response:**
```json
{
  "success": true,
  "message": "Terminal connection successful",
  "data": {
    "status": {
      "connected": true,
      "ready": true,
      "terminalId": "TERMINAL001",
      "merchantId": "MERCHANT001"
    }
  }
}
```

## Payment Processing Flow

### Automatic Merchant/Terminal Selection

The system automatically selects the correct merchant and terminal based on the following priority:

1. **terminalId** (highest priority): If provided, uses that specific terminal
2. **merchantId**: If provided, finds an active terminal for that merchant
3. **storeId**: If provided (from user session), finds merchant and terminal for that store
4. **Default**: Uses the first available active merchant with active terminal

### Processing Payment

**POST** `/api/payments/process`

#### Option 1: Specify Terminal Directly

```json
{
  "invoiceId": "INV-2024-001",
  "amount": 100.50,
  "currency": "SAR",
  "paymentMethod": "Card",
  "description": "Invoice INV-2024-001",
  "terminalId": "TERMINAL_ID"
}
```

#### Option 2: Specify Merchant (uses first active terminal)

```json
{
  "invoiceId": "INV-2024-001",
  "amount": 100.50,
  "currency": "SAR",
  "paymentMethod": "Card",
  "description": "Invoice INV-2024-001",
  "merchantId": "MERCHANT_ID"
}
```

#### Option 3: Auto-detect from Store

If the user has a `storeId`, the system automatically finds the merchant and terminal for that store:

```json
{
  "invoiceId": "INV-2024-001",
  "amount": 100.50,
  "currency": "SAR",
  "paymentMethod": "Card",
  "description": "Invoice INV-2024-001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction approved",
  "data": {
    "payment": {
      "id": "...",
      "invoiceId": "INV-2024-001",
      "merchantId": "...",
      "terminalId": "...",
      "amount": 100.50,
      "currency": "SAR",
      "paymentMethod": "Card",
      "status": "Approved",
      "transactionId": "TXN-123456789",
      "authorizationCode": "ABC123",
      "processedAt": "2024-01-15T10:30:00Z"
    },
    "terminalResponse": {
      "status": "Approved",
      "transactionId": "TXN-123456789",
      "authorizationCode": "ABC123",
      "message": "Transaction approved"
    }
  }
}
```

## API Endpoints

### Merchants

- **GET** `/api/merchants` - Get all merchants
- **GET** `/api/merchants/:id` - Get merchant by ID (includes terminals)
- **POST** `/api/merchants` - Create new merchant
- **PUT** `/api/merchants/:id` - Update merchant
- **DELETE** `/api/merchants/:id` - Delete merchant (only if no terminals)

### Terminals

- **GET** `/api/terminals` - Get all terminals (optionally filtered by `?merchantId=...`)
- **GET** `/api/terminals/:id` - Get terminal by ID
- **POST** `/api/terminals` - Create new terminal
- **PUT** `/api/terminals/:id` - Update terminal
- **DELETE** `/api/terminals/:id` - Delete terminal
- **POST** `/api/terminals/:id/test` - Test terminal connection

### Payments

- **POST** `/api/payments/process` - Process payment (supports merchantId/terminalId)
- **GET** `/api/payments/:id` - Get payment by ID
- **GET** `/api/payments/invoice/:invoiceId` - Get payments by invoice
- **GET** `/api/payments/status?terminalId=...` - Get terminal status
- **POST** `/api/payments/:id/cancel` - Cancel payment

## Multi-Merchant Scenarios

### Scenario 1: Single Store, Multiple Merchants

A store might have multiple merchants (e.g., different payment processors):

```
Store: "Main Store"
├── Merchant 1: "Visa Merchant" (MID: VISA001)
│   └── Terminal 1: Counter 1 (TID: VISA-TERM-01)
│   └── Terminal 2: Counter 2 (TID: VISA-TERM-02)
└── Merchant 2: "Mastercard Merchant" (MID: MC001)
    └── Terminal 1: Counter 3 (TID: MC-TERM-01)
```

**Usage:**
- Specify `merchantId` in payment request to use specific merchant
- Or specify `terminalId` to use specific terminal

### Scenario 2: Multiple Stores, Each with Own Merchant

Each store has its own merchant and terminals:

```
Store 1: "Downtown Store"
└── Merchant 1: "Downtown Merchant" (MID: DT001)
    └── Terminal 1: Main Counter (TID: DT-TERM-01)

Store 2: "Uptown Store"
└── Merchant 2: "Uptown Merchant" (MID: UT001)
    └── Terminal 1: Main Counter (TID: UT-TERM-01)
```

**Usage:**
- System automatically routes to correct merchant/terminal based on user's storeId
- No need to specify merchantId/terminalId in payment request

### Scenario 3: Merchant with Multiple Terminals

A merchant has multiple terminals (e.g., multiple checkout counters):

```
Merchant: "Main Merchant" (MID: MAIN001)
├── Terminal 1: Counter 1 (TID: TERM-01)
├── Terminal 2: Counter 2 (TID: TERM-02)
└── Terminal 3: Counter 3 (TID: TERM-03)
```

**Usage:**
- Specify `merchantId` to use any available terminal
- Or specify `terminalId` to use specific terminal
- System selects first active terminal if merchantId is provided

## Test Mode

Each terminal can be configured independently for test mode:

```json
{
  "testMode": true
}
```

**Benefits:**
- Test integration without affecting live terminals
- Test new terminals before going live
- Safe development and testing environment

**Note:** In test mode, payments are simulated and no actual transaction occurs.

## Safety and Accuracy

### Merchant-Terminal Validation

- Each payment is validated to ensure it goes to the correct terminal
- Merchant ID (MID) and Terminal ID (TID) are validated before processing
- Store-level access control ensures users can only access their store's merchants

### Transaction Isolation

- Complete separation of transactions per merchant
- Payment records include both merchantId and terminalId for audit trail
- No cross-merchant transaction mixing

### Error Handling

- Terminal connection errors are logged
- Failed payments are tracked with error messages
- Terminal status is updated on connection success/failure
- Last error is stored in terminal record

## Best Practices

1. **Merchant Setup**
   - Use descriptive merchant names
   - Ensure Merchant IDs (MID) are unique
   - Link merchants to stores when applicable

2. **Terminal Configuration**
   - Use descriptive terminal names
   - Configure test mode before going live
   - Test connection before processing payments
   - Set appropriate timeout values

3. **Payment Processing**
   - Specify merchantId or terminalId when needed
   - Use storeId for automatic routing
   - Handle payment errors gracefully
   - Log all transactions for audit

4. **Monitoring**
   - Monitor terminal connection status
   - Check lastError field for terminal issues
   - Review payment transaction logs
   - Track terminal usage patterns

## Troubleshooting

### Terminal Not Found

**Error:** "No active terminal found for merchant"

**Solutions:**
- Verify merchant exists and is active
- Check terminal status is "Active"
- Ensure at least one terminal is configured for the merchant

### Connection Failed

**Error:** "Failed to connect to payment terminal"

**Solutions:**
- Verify terminal IP address and port
- Check network connectivity
- Test terminal connection using `/api/terminals/:id/test`
- Review terminal lastError field
- Ensure terminal is powered on and online

### Wrong Terminal Used

**Issue:** Payment going to wrong terminal

**Solutions:**
- Specify terminalId explicitly in payment request
- Verify merchantId/terminalId mapping
- Check storeId association
- Review payment logs for routing details

### Access Denied

**Error:** "Access denied"

**Solutions:**
- Verify user has access to merchant's store
- Check storeId matches merchant's storeId
- Ensure user role has appropriate permissions

## Frontend Integration

### Payment Request Example

```typescript
// Option 1: Specify merchant
await paymentsApi.processPayment({
  invoiceId: invoice.id,
  amount: invoice.grandTotal,
  currency: 'SAR',
  paymentMethod: 'Card',
  description: `Invoice ${invoice.id}`,
  merchantId: selectedMerchantId, // Optional
});

// Option 2: Auto-detect from store (merchantId not needed)
await paymentsApi.processPayment({
  invoiceId: invoice.id,
  amount: invoice.grandTotal,
  currency: 'SAR',
  paymentMethod: 'Card',
  description: `Invoice ${invoice.id}`,
  // System will use merchant/terminal from user's store
});
```

### Merchant/Terminal Selection

You can add merchant/terminal selection to your POS:

```typescript
// Get merchants for current store
const merchants = await merchantsApi.getMerchants();

// Get terminals for selected merchant
const terminals = await terminalsApi.getTerminals({ 
  merchantId: selectedMerchantId 
});

// Process payment with selected terminal
await paymentsApi.processPayment({
  // ... payment details
  terminalId: selectedTerminalId,
});
```

## Security Considerations

1. **Access Control**
   - Store-level isolation for merchants
   - Role-based access control
   - Merchant/terminal validation

2. **Transaction Security**
   - MID/TID validation
   - Terminal authentication
   - Secure connection handling

3. **Audit Trail**
   - All payments logged with merchant/terminal
   - Transaction IDs tracked
   - Error logs maintained

## Future Enhancements

- [ ] Terminal connection pooling for better performance
- [ ] Load balancing across multiple terminals
- [ ] Real-time terminal status dashboard
- [ ] Automated terminal health monitoring
- [ ] Transaction reconciliation per merchant
- [ ] Multi-currency support per merchant
- [ ] Terminal usage analytics

## Support

For issues or questions:
- Review terminal logs in database
- Check terminal connection status
- Verify merchant/terminal configuration
- Consult payment processing logs

