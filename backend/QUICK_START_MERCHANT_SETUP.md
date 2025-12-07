# Quick Start: Multi-Merchant VX990 Setup

A quick reference guide for setting up merchants and terminals.

## Prerequisites Checklist

Before you begin, gather this information:

- [ ] Merchant ID (MID) from your payment processor
- [ ] Terminal ID (TID) from your payment processor  
- [ ] Terminal IP address (e.g., 192.168.1.100)
- [ ] Terminal port (usually 12000)
- [ ] Authentication token for API calls

---

## Setup Steps (3 Simple Steps)

### Step 1: Create Merchant

**API:** `POST /api/merchants`

**Request:**
```json
{
  "name": "Your Merchant Name",
  "merchantId": "YOUR_MID_HERE",
  "storeId": "your-store-id",
  "description": "Optional description",
  "status": "Active"
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/merchants \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Store Merchant",
    "merchantId": "MERCHANT001",
    "status": "Active"
  }'
```

**✅ Save the `merchant.id` from the response!**

---

### Step 2: Create Terminal

**API:** `POST /api/terminals`

**Request:**
```json
{
  "merchantId": "MERCHANT_ID_FROM_STEP_1",
  "terminalId": "YOUR_TID_HERE",
  "name": "Terminal Name",
  "host": "TERMINAL_IP_ADDRESS",
  "port": 12000,
  "connectionType": "ethernet",
  "status": "Active",
  "testMode": false
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/terminals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "507f1f77bcf86cd799439011",
    "terminalId": "TERMINAL001",
    "name": "Counter Terminal 1",
    "host": "192.168.1.100",
    "port": 12000,
    "connectionType": "ethernet",
    "status": "Active",
    "testMode": false
  }'
```

**✅ Save the `terminal.id` from the response!**

---

### Step 3: Test Connection

**API:** `POST /api/terminals/:id/test`

**Example:**
```bash
curl -X POST http://localhost:5000/api/terminals/507f1f77bcf86cd799439012/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**✅ If successful, you're ready to process payments!**

---

## Complete Working Example

Here's a complete example from start to finish:

### 1. Create Merchant

```bash
curl -X POST http://localhost:5000/api/merchants \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Store Merchant",
    "merchantId": "DT001",
    "storeId": "downtown",
    "description": "Merchant for downtown store",
    "status": "Active"
  }'
```

**Response:** 
```json
{
  "success": true,
  "data": {
    "merchant": {
      "id": "507f1f77bcf86cd799439011",
      "merchantId": "DT001",
      "name": "Downtown Store Merchant"
    }
  }
}
```

### 2. Create Terminal (using merchant ID from step 1)

```bash
curl -X POST http://localhost:5000/api/terminals \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "507f1f77bcf86cd799439011",
    "terminalId": "DT-TERM-01",
    "name": "Checkout Counter 1",
    "host": "192.168.1.100",
    "port": 12000,
    "connectionType": "ethernet",
    "status": "Active",
    "testMode": false
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "terminal": {
      "id": "507f1f77bcf86cd799439012",
      "terminalId": "DT-TERM-01",
      "name": "Checkout Counter 1"
    }
  }
}
```

### 3. Test Connection

```bash
curl -X POST http://localhost:5000/api/terminals/507f1f77bcf86cd799439012/test \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Success Response:**
```json
{
  "success": true,
  "message": "Terminal connection successful",
  "data": {
    "status": {
      "connected": true,
      "ready": true
    }
  }
}
```

---

## Using JavaScript/TypeScript

### Create Merchant

```typescript
import { merchantsApi } from '@/lib/api/client';

const response = await merchantsApi.createMerchant({
  name: "Main Store Merchant",
  merchantId: "MERCHANT001",
  storeId: "store1",
  description: "Primary merchant",
  status: "Active"
});

const merchantId = response.data.merchant.id; // Save this!
```

### Create Terminal

```typescript
import { terminalsApi } from '@/lib/api/client';

const response = await terminalsApi.createTerminal({
  merchantId: merchantId, // From step 1
  terminalId: "TERMINAL001",
  name: "Counter Terminal 1",
  host: "192.168.1.100",
  port: 12000,
  connectionType: "ethernet",
  status: "Active",
  testMode: false
});

const terminalId = response.data.terminal.id; // Save this!
```

### Test Connection

```typescript
const response = await terminalsApi.testTerminalConnection(terminalId);

if (response.success) {
  console.log("Terminal is ready!");
} else {
  console.error("Connection failed:", response.message);
}
```

---

## Common Configuration Templates

### Ethernet Connection (Most Common)

```json
{
  "host": "192.168.1.100",
  "port": 12000,
  "connectionType": "ethernet"
}
```

### Test Mode (No Physical Terminal Required)

```json
{
  "host": "192.168.1.100",
  "port": 12000,
  "connectionType": "ethernet",
  "testMode": true
}
```

### Multiple Terminals for Same Merchant

```bash
# Terminal 1
{
  "merchantId": "SAME_MERCHANT_ID",
  "terminalId": "TERMINAL-01",
  "host": "192.168.1.100",
  ...
}

# Terminal 2
{
  "merchantId": "SAME_MERCHANT_ID",
  "terminalId": "TERMINAL-02",
  "host": "192.168.1.101",
  ...
}
```

---

## Verification Checklist

After setup, verify everything:

- [ ] Merchant created successfully
- [ ] Terminal created and linked to merchant
- [ ] Connection test passes
- [ ] Terminal shows as "Active" status
- [ ] Payment processing works (test mode first)

---

## View Your Setup

### List All Merchants

```bash
GET /api/merchants
```

### Get Merchant with Terminals

```bash
GET /api/merchants/:merchantId
```

### List All Terminals

```bash
GET /api/terminals
```

### List Terminals for a Merchant

```bash
GET /api/terminals?merchantId=YOUR_MERCHANT_ID
```

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| "Merchant ID already exists" | Use a different MID or check existing merchants |
| "Terminal ID already exists" | Use a different TID for this merchant |
| "Connection failed" | Check IP address, port, and network connectivity |
| "Merchant not found" | Verify merchant ID is correct |

---

## Next Steps

Once setup is complete:

1. ✅ Test payment in test mode
2. ✅ Process a real payment
3. ✅ Monitor terminal status
4. ✅ Set up additional terminals if needed

For detailed documentation, see:
- `SETUP_GUIDE_MULTI_MERCHANT.md` - Comprehensive setup guide
- `MULTI_MERCHANT_TERMINAL_INTEGRATION.md` - Full integration docs

