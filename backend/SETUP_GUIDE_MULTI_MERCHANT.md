# Multi-Merchant VX990 Terminal Setup Guide

This guide provides step-by-step instructions for setting up merchants and terminals in your POS system for Verifone VX990 payment terminal integration.

## Prerequisites

Before starting, ensure you have:
- ✅ Backend server running
- ✅ Database connection configured
- ✅ Authentication token (for API calls)
- ✅ Verifone VX990 terminal information ready:
  - Merchant ID (MID) from your payment processor
  - Terminal ID (TID) from your payment processor
  - Terminal IP address
  - Terminal port (usually 12000)
  - Connection type (Ethernet/USB/Serial)

## Overview

The setup process involves three main steps:
1. **Create a Merchant** - Register merchant with Merchant ID (MID)
2. **Create Terminals** - Register terminals and link them to merchants
3. **Test Connections** - Verify terminals are working correctly

---

## Step 1: Create a Merchant

A merchant represents a business entity that processes payments. Each merchant has a unique Merchant ID (MID) provided by your payment processor.

### API Endpoint

**POST** `/api/merchants`

### Request Headers

```
Authorization: Bearer YOUR_AUTH_TOKEN
Content-Type: application/json
```

### Request Body

```json
{
  "name": "Main Store Merchant",
  "merchantId": "MERCHANT001",
  "storeId": "store1",
  "description": "Primary merchant for main store location",
  "status": "Active"
}
```

### Field Descriptions

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `name` | ✅ Yes | Friendly name for the merchant | "Main Store Merchant" |
| `merchantId` | ✅ Yes | Merchant ID (MID) from payment processor | "MERCHANT001" |
| `storeId` | ❌ No | Link to store (if multi-store setup) | "store1" |
| `description` | ❌ No | Additional information about merchant | "Primary merchant..." |
| `status` | ❌ No | Merchant status (default: "Active") | "Active" or "Inactive" |

### Example Request (cURL)

```bash
curl -X POST http://localhost:5000/api/merchants \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Store Merchant",
    "merchantId": "MERCHANT001",
    "storeId": "store1",
    "description": "Primary merchant for main store location",
    "status": "Active"
  }'
```

### Example Response

```json
{
  "success": true,
  "message": "Merchant created successfully",
  "data": {
    "merchant": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Main Store Merchant",
      "merchantId": "MERCHANT001",
      "storeId": "store1",
      "status": "Active",
      "description": "Primary merchant for main store location",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Important Notes

- **Merchant ID (MID)** must be unique across the system
- **Merchant ID** is automatically converted to uppercase
- Save the `merchant.id` from the response - you'll need it for Step 2

---

## Step 2: Create a Terminal

A terminal is a physical Verifone VX990 payment device linked to a merchant. Each merchant can have multiple terminals.

### API Endpoint

**POST** `/api/terminals`

### Request Headers

```
Authorization: Bearer YOUR_AUTH_TOKEN
Content-Type: application/json
```

### Request Body

```json
{
  "merchantId": "507f1f77bcf86cd799439011",
  "terminalId": "TERMINAL001",
  "name": "Counter Terminal 1",
  "host": "192.168.1.100",
  "port": 12000,
  "connectionType": "ethernet",
  "status": "Active",
  "testMode": false,
  "timeout": 60000,
  "description": "Main counter terminal for checkout"
}
```

### Field Descriptions

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `merchantId` | ✅ Yes | ID of the merchant from Step 1 | "507f1f77bcf86cd799439011" |
| `terminalId` | ✅ Yes | Terminal ID (TID) from payment processor | "TERMINAL001" |
| `name` | ✅ Yes | Friendly name for the terminal | "Counter Terminal 1" |
| `host` | ✅ Yes | IP address or hostname of terminal | "192.168.1.100" |
| `port` | ❌ No | Port number (default: 12000) | 12000 |
| `connectionType` | ❌ No | Connection type (default: "ethernet") | "ethernet", "usb", or "serial" |
| `status` | ❌ No | Terminal status (default: "Active") | "Active", "Inactive", or "Maintenance" |
| `testMode` | ❌ No | Enable test mode (default: false) | true or false |
| `timeout` | ❌ No | Payment timeout in milliseconds (default: 60000) | 60000 |
| `description` | ❌ No | Additional information | "Main counter terminal..." |

### Connection Types

- **ethernet**: Terminal connected via Ethernet network (most common)
- **usb**: Terminal connected via USB (requires IP over USB bridge)
- **serial**: Terminal connected via Serial port (requires serial-to-TCP bridge)

### Example Request (cURL)

```bash
curl -X POST http://localhost:5000/api/terminals \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "507f1f77bcf86cd799439011",
    "terminalId": "TERMINAL001",
    "name": "Counter Terminal 1",
    "host": "192.168.1.100",
    "port": 12000,
    "connectionType": "ethernet",
    "status": "Active",
    "testMode": false,
    "timeout": 60000,
    "description": "Main counter terminal for checkout"
  }'
```

### Example Response

```json
{
  "success": true,
  "message": "Terminal created successfully",
  "data": {
    "terminal": {
      "id": "507f1f77bcf86cd799439012",
      "merchantId": "507f1f77bcf86cd799439011",
      "terminalId": "TERMINAL001",
      "name": "Counter Terminal 1",
      "host": "192.168.1.100",
      "port": 12000,
      "connectionType": "ethernet",
      "status": "Active",
      "testMode": false,
      "timeout": 60000,
      "description": "Main counter terminal for checkout",
      "createdAt": "2024-01-15T10:35:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    }
  }
}
```

### Important Notes

- **Terminal ID (TID)** must be unique per merchant
- **Terminal ID** is automatically converted to uppercase
- Use the merchant ID from Step 1's response
- Save the `terminal.id` for testing in Step 3

---

## Step 3: Test Terminal Connection

Before processing live payments, test that the system can connect to your terminal.

### API Endpoint

**POST** `/api/terminals/:id/test`

Replace `:id` with the terminal ID from Step 2.

### Request Headers

```
Authorization: Bearer YOUR_AUTH_TOKEN
```

### Example Request (cURL)

```bash
curl -X POST http://localhost:5000/api/terminals/507f1f77bcf86cd799439012/test \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### Example Response (Success)

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

### Example Response (Failure)

```json
{
  "success": false,
  "message": "Terminal connection failed",
  "error": "Connection timeout: Unable to connect to payment terminal"
}
```

### Troubleshooting Connection Issues

If the connection test fails, check:

1. **Network Connectivity**
   ```bash
   ping 192.168.1.100  # Replace with your terminal IP
   ```

2. **Port Accessibility**
   ```bash
   telnet 192.168.1.100 12000  # Replace with your terminal IP and port
   ```

3. **Terminal Configuration**
   - Verify terminal IP address is correct
   - Ensure terminal is powered on
   - Check terminal network settings
   - Verify port number (usually 12000)

4. **Firewall Settings**
   - Ensure port 12000 is open
   - Check if firewall is blocking connections

---

## Complete Setup Example

Here's a complete example setting up one merchant with two terminals:

### Step 1: Create Merchant

```bash
curl -X POST http://localhost:5000/api/merchants \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Store Merchant",
    "merchantId": "DT001",
    "storeId": "downtown",
    "description": "Merchant for downtown store location",
    "status": "Active"
  }'
```

**Response:** Save the `merchant.id` (e.g., "507f1f77bcf86cd799439011")

### Step 2: Create Terminal 1

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

### Step 3: Create Terminal 2

```bash
curl -X POST http://localhost:5000/api/terminals \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "507f1f77bcf86cd799439011",
    "terminalId": "DT-TERM-02",
    "name": "Checkout Counter 2",
    "host": "192.168.1.101",
    "port": 12000,
    "connectionType": "ethernet",
    "status": "Active",
    "testMode": false
  }'
```

### Step 4: Test Both Terminals

```bash
# Test Terminal 1
curl -X POST http://localhost:5000/api/terminals/TERMINAL_ID_1/test \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Test Terminal 2
curl -X POST http://localhost:5000/api/terminals/TERMINAL_ID_2/test \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

---

## Additional Setup Scenarios

### Scenario 1: Multiple Merchants (Different Payment Processors)

If you have multiple merchants using different payment processors:

```bash
# Create Merchant 1 (Visa)
curl -X POST http://localhost:5000/api/merchants \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Visa Merchant",
    "merchantId": "VISA001",
    "status": "Active"
  }'

# Create Merchant 2 (Mastercard)
curl -X POST http://localhost:5000/api/merchants \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mastercard Merchant",
    "merchantId": "MC001",
    "status": "Active"
  }'
```

### Scenario 2: Test Mode Setup

To test the integration without a physical terminal:

```bash
curl -X POST http://localhost:5000/api/terminals \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "MERCHANT_ID",
    "terminalId": "TEST-TERM-01",
    "name": "Test Terminal",
    "host": "192.168.1.100",
    "port": 12000,
    "connectionType": "ethernet",
    "status": "Active",
    "testMode": true
  }'
```

**Note:** In test mode, payments are simulated and no actual transaction occurs.

---

## Viewing Your Setup

### List All Merchants

```bash
GET /api/merchants
```

### Get Merchant Details (Includes Terminals)

```bash
GET /api/merchants/:id
```

### List All Terminals

```bash
GET /api/terminals
```

### Filter Terminals by Merchant

```bash
GET /api/terminals?merchantId=507f1f77bcf86cd799439011
```

### Get Terminal Details

```bash
GET /api/terminals/:id
```

---

## Common Configuration Values

### Ethernet Connection (Most Common)

```json
{
  "host": "192.168.1.100",
  "port": 12000,
  "connectionType": "ethernet"
}
```

### USB Connection

For USB connections, you typically need an IP-over-USB bridge:

```json
{
  "host": "192.168.1.1",
  "port": 12000,
  "connectionType": "usb"
}
```

### Serial Connection

For serial connections, you need a serial-to-TCP bridge:

```json
{
  "host": "127.0.0.1",
  "port": 12345,
  "connectionType": "serial"
}
```

---

## Updating Configuration

### Update Merchant

```bash
PUT /api/merchants/:id
Content-Type: application/json

{
  "name": "Updated Merchant Name",
  "status": "Inactive"
}
```

### Update Terminal

```bash
PUT /api/terminals/:id
Content-Type: application/json

{
  "host": "192.168.1.200",
  "port": 12000,
  "testMode": false
}
```

---

## Next Steps

After completing the setup:

1. ✅ **Verify Connections**: Test all terminals using the test endpoint
2. ✅ **Process Test Payment**: Try a test payment in test mode
3. ✅ **Configure POS**: Update your POS frontend to use merchant/terminal IDs
4. ✅ **Go Live**: Set `testMode: false` and process real payments

---

## Troubleshooting

### Error: "Merchant ID already exists"

- The Merchant ID (MID) must be unique
- Check if merchant already exists: `GET /api/merchants`
- Use a different MID or update existing merchant

### Error: "Terminal ID already exists for this merchant"

- Terminal ID must be unique per merchant
- Check existing terminals: `GET /api/terminals?merchantId=...`
- Use a different Terminal ID

### Error: "Merchant not found"

- Verify merchant ID is correct
- Check merchant exists: `GET /api/merchants/:id`

### Error: "Failed to connect to payment terminal"

- Verify terminal IP address and port
- Check network connectivity
- Ensure terminal is powered on
- Test connection: `POST /api/terminals/:id/test`

---

## Quick Reference

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/merchants` | GET | List all merchants |
| `/api/merchants/:id` | GET | Get merchant details |
| `/api/merchants` | POST | Create merchant |
| `/api/merchants/:id` | PUT | Update merchant |
| `/api/merchants/:id` | DELETE | Delete merchant |
| `/api/terminals` | GET | List all terminals |
| `/api/terminals/:id` | GET | Get terminal details |
| `/api/terminals` | POST | Create terminal |
| `/api/terminals/:id` | PUT | Update terminal |
| `/api/terminals/:id` | DELETE | Delete terminal |
| `/api/terminals/:id/test` | POST | Test terminal connection |

### Required Information

Before starting, gather:
- ✅ Merchant ID (MID) from payment processor
- ✅ Terminal ID (TID) from payment processor
- ✅ Terminal IP address
- ✅ Terminal port (usually 12000)
- ✅ Connection type (ethernet/usb/serial)

---

## Support

For additional help:
- Review `MULTI_MERCHANT_TERMINAL_INTEGRATION.md` for detailed documentation
- Check terminal logs in database for error details
- Verify network connectivity and terminal configuration

