# VX990 Terminal Configuration - Required Setup

## Quick Answer

**Yes, terminals MUST be manually configured.** The system does NOT automatically detect terminals. You need to register each terminal in the database with its specific configuration before it can process payments.

---

## Required Configuration

Each VX990 terminal requires manual setup with the following information:

### 1. **Merchant ID (MID)**
- Provided by your payment processor
- Must be registered in the system first (create a Merchant)
- Example: "MERCHANT001"

### 2. **Terminal ID (TID)**
- Provided by your payment processor
- Unique per merchant
- Example: "TERMINAL001"

### 3. **IP Address**
- The network IP address of the terminal
- Example: "192.168.1.100"
- You need to configure this on the terminal itself

### 4. **Port Number**
- Usually 12000 (default)
- Must match terminal's configured port
- Example: 12000

### 5. **Connection Type**
- "ethernet" (most common)
- "usb" (requires IP over USB bridge)
- "serial" (requires serial-to-TCP bridge)

---

## Setup Process Overview

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Configure Terminal on Physical Device          │
│ - Set IP address on terminal                            │
│ - Configure port (usually 12000)                        │
│ - Ensure terminal is on same network as POS system      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Register Merchant in POS System                 │
│ - Create merchant with Merchant ID (MID)                │
│ - Link to store (optional)                              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Register Terminal in POS System                 │
│ - Create terminal with Terminal ID (TID)                │
│ - Enter IP address                                      │
│ - Enter port number                                     │
│ - Select connection type                                │
│ - Link to merchant                                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 4: Test Connection                                │
│ - Verify system can connect to terminal                 │
│ - Check terminal responds correctly                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ READY: System can now route payments to terminal        │
└─────────────────────────────────────────────────────────┘
```

---

## Detailed Setup Steps

### Step 1: Configure Terminal Hardware

**On the VX990 Terminal itself:**

1. Access terminal settings menu
2. Navigate to Network Settings
3. Configure:
   - **IP Address**: Set static IP (e.g., 192.168.1.100)
   - **Subnet Mask**: Usually 255.255.255.0
   - **Gateway**: Your router IP
   - **Port**: Usually 12000 (verify with your payment processor)
4. Save settings
5. Ensure terminal is on the same network as your POS server

**Note:** Terminal network configuration is done ON THE TERMINAL DEVICE, not in the POS system.

### Step 2: Register Merchant in POS System

**API:** `POST /api/merchants`

```json
{
  "name": "Main Store Merchant",
  "merchantId": "MERCHANT001",  // ← From payment processor
  "storeId": "store1",
  "status": "Active"
}
```

**Why needed:** The system needs to know which merchant (MID) to use for payment processing.

### Step 3: Register Terminal in POS System

**API:** `POST /api/terminals`

```json
{
  "merchantId": "MERCHANT_ID_FROM_STEP_2",
  "terminalId": "TERMINAL001",  // ← From payment processor
  "name": "Counter Terminal 1",
  "host": "192.168.1.100",      // ← Terminal's IP address
  "port": 12000,                 // ← Terminal's port
  "connectionType": "ethernet",  // ← How terminal connects
  "status": "Active",
  "testMode": false
}
```

**Why needed:** The system needs to know:
- Where to find the terminal (IP address)
- How to connect (port, connection type)
- Which merchant it belongs to
- What Terminal ID to use

### Step 4: Test Connection

**API:** `POST /api/terminals/:id/test`

This verifies:
- ✅ Network connectivity to terminal
- ✅ Port is accessible
- ✅ Terminal responds correctly

---

## How Payment Routing Works

Once configured, here's how payments are routed:

```
Payment Request
    ↓
System checks:
    ↓
1. Is merchantId specified? → Use that merchant
2. Is terminalId specified? → Use that terminal
3. Is storeId available? → Find merchant for store
4. Default → Use first available merchant/terminal
    ↓
System loads terminal configuration:
    - IP address (where to connect)
    - Port (which port to use)
    - Connection type (how to connect)
    - Merchant ID (MID)
    - Terminal ID (TID)
    ↓
System connects to terminal using configuration
    ↓
Sends payment request with amount
    ↓
Terminal processes payment
    ↓
System receives response and updates invoice
```

**Key Point:** The system uses the stored configuration to connect to the correct terminal. Without this configuration, it cannot find or connect to terminals.

---

## Why Manual Configuration is Required

### 1. **Security**
- Prevents unauthorized terminals from connecting
- Ensures only registered terminals process payments
- Validates Merchant ID and Terminal ID

### 2. **Accuracy**
- Guarantees payments go to correct terminal
- Prevents cross-merchant transaction mixing
- Ensures proper audit trail

### 3. **Network Requirements**
- Terminals may be on different networks
- Different connection types (Ethernet/USB/Serial)
- Custom port configurations

### 4. **Business Logic**
- Multiple merchants may share network
- Need to route to specific merchant's terminal
- Store-level isolation requirements

---

## Terminal Discovery (Optional Helper)

The system does have a discovery endpoint, but it's **NOT used for automatic setup**:

**API:** `GET /api/payments/discover`

This endpoint can:
- Find terminals broadcasting on the network
- Help identify terminal IP addresses
- Assist in initial setup

**However:**
- Discovery is optional
- You still need to manually register terminals
- Discovery just helps find terminal IPs

---

## Complete Configuration Example

### Scenario: Setting up 2 terminals for 1 merchant

**Terminal 1:**
- Physical IP: 192.168.1.100
- Port: 12000
- MID: MERCHANT001
- TID: TERMINAL001

**Terminal 2:**
- Physical IP: 192.168.1.101
- Port: 12000
- MID: MERCHANT001 (same merchant)
- TID: TERMINAL002

**Setup:**

```bash
# 1. Create Merchant
POST /api/merchants
{
  "name": "Main Merchant",
  "merchantId": "MERCHANT001"
}

# 2. Create Terminal 1
POST /api/terminals
{
  "merchantId": "MERCHANT_ID",
  "terminalId": "TERMINAL001",
  "host": "192.168.1.100",  # ← Terminal's actual IP
  "port": 12000
}

# 3. Create Terminal 2
POST /api/terminals
{
  "merchantId": "MERCHANT_ID",
  "terminalId": "TERMINAL002",
  "host": "192.168.1.101",  # ← Terminal's actual IP
  "port": 12000
}

# 4. Test both
POST /api/terminals/TERMINAL_1_ID/test
POST /api/terminals/TERMINAL_2_ID/test
```

---

## Configuration Checklist

Before processing payments, ensure:

- [ ] Terminal is physically configured (IP, port on device)
- [ ] Terminal is on same network as POS server
- [ ] Merchant is registered in POS system
- [ ] Terminal is registered in POS system
- [ ] Terminal IP address matches physical terminal
- [ ] Port number matches terminal configuration
- [ ] Connection test passes
- [ ] Merchant ID (MID) is correct
- [ ] Terminal ID (TID) is correct

---

## Common Configuration Mistakes

### ❌ Wrong IP Address
**Problem:** Terminal registered with wrong IP
**Result:** Connection fails
**Fix:** Verify terminal's actual IP address

### ❌ Wrong Port
**Problem:** Port mismatch between terminal and system
**Result:** Connection fails
**Fix:** Check terminal settings, usually 12000

### ❌ Network Issues
**Problem:** Terminal and POS on different networks
**Result:** Cannot connect
**Fix:** Ensure same network or configure routing

### ❌ Wrong Merchant ID
**Problem:** MID doesn't match payment processor
**Result:** Payments may fail or go to wrong merchant
**Fix:** Verify MID with payment processor

### ❌ Wrong Terminal ID
**Problem:** TID doesn't match payment processor
**Result:** Payments may fail
**Fix:** Verify TID with payment processor

---

## Summary

**Required Configuration:**
1. ✅ Configure terminal hardware (IP, port)
2. ✅ Register merchant in POS system (MID)
3. ✅ Register terminal in POS system (TID, IP, port, connection type)
4. ✅ Test connection

**Automatic Detection:**
- ❌ Terminals are NOT automatically detected
- ❌ Configuration is NOT automatic
- ✅ System uses stored configuration to route payments

**Payment Routing:**
- ✅ System uses stored terminal configuration
- ✅ Connects to terminal using IP/port
- ✅ Sends payment with MID/TID
- ✅ Updates invoice based on response

---

## Next Steps

1. **Gather Information:**
   - Merchant ID (MID) from payment processor
   - Terminal ID (TID) from payment processor
   - Terminal IP address (from terminal settings)
   - Port number (usually 12000)

2. **Follow Setup Guide:**
   - See `SETUP_GUIDE_MULTI_MERCHANT.md` for detailed steps
   - See `QUICK_START_MERCHANT_SETUP.md` for quick reference

3. **Test Before Going Live:**
   - Use test mode first
   - Verify connection works
   - Process test payment

For detailed setup instructions, refer to:
- `SETUP_GUIDE_MULTI_MERCHANT.md` - Complete setup guide
- `QUICK_START_MERCHANT_SETUP.md` - Quick reference

