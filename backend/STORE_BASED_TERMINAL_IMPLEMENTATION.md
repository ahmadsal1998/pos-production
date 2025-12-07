# Store-Based Terminal Implementation

## Overview

The system now supports adding payment terminals directly to stores without requiring a merchant entity. This allows stores to configure terminals with their MID (Merchant ID) directly, simplifying terminal management for single-store operations.

## Backend Changes

### 1. Terminal Model (`backend/src/models/Terminal.ts`)

**New Fields:**
- `merchantId` - Now **optional** (ObjectId reference to Merchant)
- `storeId` - **New**: Direct store linkage (String)
- `merchantIdMid` - **New**: MID (Merchant ID) stored directly on terminal (String, uppercase)

**Validation:**
- Terminal must have **either**:
  - `merchantId` (merchant-based terminal - existing behavior)
  - OR `storeId` + `merchantIdMid` (store-based terminal - new behavior)

**Indexes:**
- Unique terminal ID per merchant (for merchant-based terminals)
- Unique terminal ID per store (for store-based terminals)
- Indexes on `storeId` and `merchantIdMid` for querying

### 2. Terminal Controller (`backend/src/controllers/terminals.controller.ts`)

**Updated Functions:**

#### `createTerminal`
- Supports creating terminals in two modes:
  1. **Merchant-based**: Provide `merchantId` (existing behavior)
  2. **Store-based**: Provide `storeId` + `merchantIdMid` (new)
- Validates access permissions based on user's store
- Ensures unique terminal IDs per merchant or per store

#### `getTerminals`
- Can filter by `merchantId` OR `storeId`
- Shows both merchant-based and store-based terminals for user's store
- Admin users see all terminals

#### `testTerminalConnection`
- Handles both terminal types
- Extracts MID from either merchant.merchantId or terminal.merchantIdMid
- Validates store access for both types

### 3. Payment Controller (`backend/src/controllers/payments.controller.ts`)

**Updated `processPayment`:**
- When `storeId` is provided, first looks for store-based terminals
- Falls back to merchant-based terminals if no store-based terminal found
- Extracts MID correctly based on terminal type:
  - Store-based: uses `terminal.merchantIdMid`
  - Merchant-based: uses `merchant.merchantId`
- Validates access permissions for both terminal types

## API Usage

### Creating a Store-Based Terminal

**Endpoint:** `POST /api/terminals`

**Request Body (Store-Based):**
```json
{
  "storeId": "store1",
  "merchantIdMid": "MID123456",
  "terminalId": "TID001",
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

**Request Body (Merchant-Based - Existing):**
```json
{
  "merchantId": "merchant_object_id",
  "terminalId": "TID001",
  "name": "Counter Terminal 1",
  "host": "192.168.1.100",
  "port": 12000,
  "connectionType": "ethernet"
}
```

### Querying Terminals

**By Store:**
```
GET /api/terminals?storeId=store1
```

**By Merchant:**
```
GET /api/terminals?merchantId=merchant_id
```

**All (Admin only):**
```
GET /api/terminals
```

## Payment Processing Flow

1. **When storeId is provided:**
   - First searches for store-based terminal with `storeId`
   - If not found, searches for merchant-based terminal via Merchant with `storeId`
   - Uses appropriate MID (from terminal.merchantIdMid or merchant.merchantId)

2. **When terminalId is provided:**
   - Loads terminal directly
   - Determines type (merchant-based or store-based)
   - Extracts MID accordingly

3. **When merchantId is provided:**
   - Uses existing merchant-based terminal logic

## Access Control

- **Admin users**: Can create/manage terminals for any store
- **Non-admin users**: Can only create/manage terminals for their own store
- Store access is validated for both terminal types

## Frontend Requirements

The frontend needs to be updated to:

1. **Add Store-Based Terminal Form**
   - Show option to create terminal "directly to store" or "to merchant"
   - Fields for store-based terminals:
     - Store ID (dropdown/autofill from user's store)
     - Merchant ID (MID) - text input
     - Terminal ID (TID)
     - Other terminal configuration fields

2. **Update Terminal List**
   - Show whether terminal is merchant-based or store-based
   - Filter by store or merchant
   - Display store ID or merchant name accordingly

3. **Update Payment Flow**
   - Automatically use store-based terminals when available
   - Fall back to merchant-based terminals if needed

## Migration Notes

- Existing terminals continue to work (merchant-based)
- New store-based terminals can be added alongside merchant-based terminals
- No data migration required - both types coexist
- Indexes support both terminal types efficiently

## Benefits

1. **Simplified Setup**: Stores can add terminals without creating merchant entities
2. **Flexibility**: Supports both merchant-based and store-based terminals
3. **Backward Compatible**: Existing merchant-based terminals continue to work
4. **Clear Separation**: Store-based terminals are clearly identified and isolated

## Testing Checklist

- [ ] Create store-based terminal successfully
- [ ] Create merchant-based terminal successfully
- [ ] Query terminals by store
- [ ] Query terminals by merchant
- [ ] Test payment processing with store-based terminal
- [ ] Test payment processing with merchant-based terminal
- [ ] Verify access control for non-admin users
- [ ] Test terminal connection for store-based terminals
- [ ] Verify unique terminal ID enforcement per store
- [ ] Verify unique terminal ID enforcement per merchant

