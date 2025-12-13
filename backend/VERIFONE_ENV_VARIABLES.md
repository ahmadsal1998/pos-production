# Verifone VX990 Store-Based Terminal - Environment Variables Guide

## Overview

For **Store-Based Terminal Integration**, terminal configuration (IP address, port, MID, TID, etc.) is primarily stored in the **database** through the Merchant Terminal Management UI. However, environment variables can be used as **optional defaults/fallbacks**.

## Important Note

✅ **Store-Based Terminals**: All terminal configuration is managed through the database (UI), not environment variables.  
⚠️ **Environment Variables**: Serve as optional defaults only. They are overridden by database-stored terminal configuration during payment processing.

---

## Optional Environment Variables

These variables are used as **defaults** when creating Verifone service instances. They are **automatically overridden** by the terminal configuration stored in the database when processing payments.

### Terminal Connection Settings

```env
# Default terminal host/IP address (optional - overridden by database)
VERIFONE_HOST=192.168.1.100

# Default terminal port (optional - overridden by database)
# Common ports: 12000 (default), 8080, 9100
VERIFONE_PORT=12000

# Default connection type (optional - overridden by database)
# Options: 'ethernet', 'usb', 'serial'
VERIFONE_CONNECTION_TYPE=ethernet

# Default payment timeout in milliseconds (optional - overridden by database)
# 60000 = 60 seconds, 30000 = 30 seconds
VERIFONE_TIMEOUT=60000
```

### Terminal Identification

```env
# Default Merchant ID / MID (optional - overridden by database)
# Used only as fallback if terminal config doesn't specify MID
VERIFONE_MERCHANT_ID=MID123456789

# Default Terminal ID / TID (optional - overridden by database)
# Used only as fallback if terminal config doesn't specify TID
VERIFONE_TERMINAL_ID=TERMINAL001
```

### Test Mode

```env
# Enable test mode globally (optional - overridden by database per-terminal setting)
# Set to 'true' to enable test mode, 'false' to disable
# Default: 'true' if NODE_ENV is not 'production', otherwise 'false'
VERIFONE_TEST_MODE=false
```

---

## Complete .env Example

### Development Environment

```env
# ==========================================
# SERVER CONFIGURATION
# ==========================================
PORT=5000
NODE_ENV=development

# ==========================================
# DATABASE CONFIGURATION
# ==========================================
MONGODB_URI=mongodb://localhost:27017/pos-system

# ==========================================
# JWT CONFIGURATION
# ==========================================
JWT_SECRET=your-secret-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-too
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# ==========================================
# CORS CONFIGURATION
# ==========================================
CLIENT_URL=http://localhost:5173

# ==========================================
# VERIFONE VX990 TERMINAL (OPTIONAL DEFAULTS)
# ==========================================
# These are optional defaults - terminal configuration is stored in database
# These values are overridden by the terminal settings configured in the UI

# Default connection settings (only used if terminal config missing)
VERIFONE_HOST=192.168.1.100
VERIFONE_PORT=12000
VERIFONE_CONNECTION_TYPE=ethernet
VERIFONE_TIMEOUT=60000

# Default terminal identification (only used as fallback)
VERIFONE_MERCHANT_ID=MID123456789
VERIFONE_TERMINAL_ID=TERMINAL001

# Global test mode (per-terminal test mode in database takes precedence)
VERIFONE_TEST_MODE=true

# ==========================================
# EMAIL CONFIGURATION (Optional)
# ==========================================
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=no-reply@yourdomain.com
RESEND_FROM_NAME=POS System
```

### Production Environment

```env
# ==========================================
# SERVER CONFIGURATION
# ==========================================
PORT=10000
NODE_ENV=production

# ==========================================
# DATABASE CONFIGURATION
# ==========================================
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pos-system?retryWrites=true&w=majority

# ==========================================
# JWT CONFIGURATION
# ==========================================
JWT_SECRET=<generate-secure-random-hex-string>
JWT_REFRESH_SECRET=<generate-different-secure-random-hex-string>
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# ==========================================
# CORS CONFIGURATION
# ==========================================
CLIENT_URL=https://your-frontend-domain.com

# ==========================================
# VERIFONE VX990 TERMINAL (OPTIONAL DEFAULTS)
# ==========================================
# These are optional defaults - terminal configuration is stored in database
# Per-terminal settings configured in the UI override these values

VERIFONE_HOST=192.168.1.100
VERIFONE_PORT=12000
VERIFONE_CONNECTION_TYPE=ethernet
VERIFONE_TIMEOUT=60000

# Disable test mode in production (unless overridden per-terminal)
VERIFONE_TEST_MODE=false

# ==========================================
# EMAIL CONFIGURATION (Optional)
# ==========================================
RESEND_API_KEY=re_your_production_resend_api_key
RESEND_FROM_EMAIL=no-reply@yourdomain.com
RESEND_FROM_NAME=POS System
```

---

## How Store-Based Terminal Configuration Works

### 1. Terminal Configuration is Stored in Database

When you add a terminal through the Merchant Terminal Management UI (`/financial/merchant-terminals`), all configuration is saved to the database:

- **Store ID**: The store this terminal belongs to
- **MID (Merchant ID)**: Payment processor merchant ID
- **TID (Terminal ID)**: Payment processor terminal ID
- **Host/IP**: Terminal IP address or hostname
- **Port**: Terminal port (default: 12000)
- **Connection Type**: ethernet, usb, or serial
- **Timeout**: Payment timeout in milliseconds
- **Test Mode**: Enable/disable test mode for this terminal

### 2. Payment Processing Uses Database Configuration

During payment processing:

1. System finds the terminal based on `storeId` (from authenticated user)
2. Retrieves terminal configuration from database
3. Creates Verifone service with **database values** (overrides any env defaults)
4. Connects to terminal and processes payment

### 3. Environment Variables as Fallbacks

Environment variables are **only used** if:
- Terminal configuration is missing a value
- Creating a service without specific terminal config
- Development/testing scenarios

---

## Environment Variable Details

### VERIFONE_HOST

**Type**: String (IP address or hostname)  
**Default**: `192.168.1.100`  
**Required**: No (terminal config in database takes precedence)  
**Example**: `VERIFONE_HOST=192.168.1.50`

**Usage**: Default terminal IP address. Overridden by terminal's `host` field in database.

---

### VERIFONE_PORT

**Type**: Number (1-65535)  
**Default**: `12000`  
**Required**: No (terminal config in database takes precedence)  
**Example**: `VERIFONE_PORT=12000`

**Common Ports**:
- `12000` - Default Verifone ECR protocol port
- `8080` - Alternative HTTP-based integration
- `9100` - Alternative TCP port

**Usage**: Default terminal port. Overridden by terminal's `port` field in database.

---

### VERIFONE_CONNECTION_TYPE

**Type**: String (enum)  
**Options**: `ethernet`, `usb`, `serial`  
**Default**: `ethernet`  
**Required**: No (terminal config in database takes precedence)  
**Example**: `VERIFONE_CONNECTION_TYPE=ethernet`

**Connection Types**:
- `ethernet` - TCP/IP over Ethernet (most common)
- `usb` - USB connection (requires bridge service)
- `serial` - Serial port connection (requires bridge service)

**Usage**: Default connection type. Overridden by terminal's `connectionType` field in database.

---

### VERIFONE_TIMEOUT

**Type**: Number (milliseconds)  
**Default**: `60000` (60 seconds)  
**Required**: No (terminal config in database takes precedence)  
**Minimum**: `1000` (1 second)  
**Example**: `VERIFONE_TIMEOUT=60000`

**Recommended Values**:
- `30000` (30 seconds) - Fast networks, simple transactions
- `60000` (60 seconds) - Standard timeout (default)
- `90000` (90 seconds) - Slow networks, complex transactions
- `120000` (120 seconds) - Maximum recommended

**Usage**: Default payment processing timeout. Overridden by terminal's `timeout` field in database.

---

### VERIFONE_MERCHANT_ID

**Type**: String  
**Default**: `undefined`  
**Required**: No (terminal config in database takes precedence)  
**Example**: `VERIFONE_MERCHANT_ID=MID123456789`

**Usage**: Default Merchant ID (MID). Overridden by terminal's `merchantIdMid` field in database (for store-based terminals).

**Note**: For store-based terminals, MID is stored in the terminal record, not in environment variables.

---

### VERIFONE_TERMINAL_ID

**Type**: String  
**Default**: `undefined`  
**Required**: No (terminal config in database takes precedence)  
**Example**: `VERIFONE_TERMINAL_ID=TERMINAL001`

**Usage**: Default Terminal ID (TID). Overridden by terminal's `terminalId` field in database.

---

### VERIFONE_TEST_MODE

**Type**: Boolean (string: `'true'` or `'false'`)  
**Default**: 
- `true` if `NODE_ENV !== 'production'`
- `false` if `NODE_ENV === 'production'`  
**Required**: No (terminal config in database takes precedence)  
**Example**: `VERIFONE_TEST_MODE=true`

**Usage**: Global test mode flag. Can be overridden per-terminal in database.

**Test Mode Behavior**:
- When `true`: Simulates payment processing without connecting to actual terminal
- When `false`: Connects to real terminal hardware
- Per-terminal test mode in database takes precedence over this global setting

---

## Setup Instructions

### Step 1: Configure Terminal in Database (Recommended)

1. Access Merchant Terminal Management: `/financial/merchant-terminals`
2. Click "Add Terminal" (إضافة جهاز دفع)
3. Select "Store-Based Terminal" (جهاز مرتبط بمتجر)
4. Fill in terminal details:
   - **Store ID**: Your store identifier (e.g., `store1`)
   - **MID**: Merchant ID from payment processor
   - **TID**: Terminal ID from payment processor
   - **Name**: Friendly name (e.g., "Terminal 1 - Store 1")
   - **IP Address**: Terminal's IP address
   - **Port**: Terminal port (usually 12000)
   - **Connection Type**: Usually "Ethernet"
   - **Test Mode**: Enable for testing, disable for production
   - **Timeout**: Payment timeout (default: 60000ms)
5. Click "Create" (إنشاء)

### Step 2: Optional - Set Environment Variable Defaults

Add to your `.env` file in the `backend` directory:

```env
# Optional defaults (overridden by database config)
VERIFONE_HOST=192.168.1.100
VERIFONE_PORT=12000
VERIFONE_CONNECTION_TYPE=ethernet
VERIFONE_TIMEOUT=60000
VERIFONE_TEST_MODE=false
```

### Step 3: Test Terminal Connection

1. In Merchant Terminal Management page, click the test connection icon (🔌)
2. System will attempt to connect to terminal
3. Check connection status and any error messages

---

## Production Deployment

For production, you typically **do NOT need** Verifone environment variables because:

1. ✅ All terminal configuration is stored in database
2. ✅ Each terminal has its own configuration
3. ✅ Configuration can be updated through UI without code changes

**However**, you may want to set:

```env
# Only if you want a global default test mode setting
VERIFONE_TEST_MODE=false
```

---

## Troubleshooting

### Terminal Connection Issues

1. **Check Terminal Configuration in Database**:
   - Verify IP address is correct
   - Verify port matches terminal settings
   - Check connection type matches terminal setup

2. **Verify Network Connectivity**:
   - Ping terminal IP: `ping 192.168.1.100`
   - Test port: `telnet 192.168.1.100 12000`
   - Check firewall rules

3. **Check Terminal Settings**:
   - Terminal must be in ECR mode
   - Network settings must match configuration
   - Terminal must be powered on and connected

### Test Mode Not Working

- Check per-terminal test mode setting in database
- Verify `VERIFONE_TEST_MODE` environment variable (if set)
- Check `NODE_ENV` - test mode defaults to `true` in development

### Payment Timeouts

- Increase timeout in terminal configuration (database)
- Check network latency
- Verify terminal is responsive
- Check for firewall/network issues

---

## Summary

| Configuration | Location | Required | Override Priority |
|--------------|----------|----------|-------------------|
| Host/IP | Database (UI) | ✅ Yes | Database → Env Default |
| Port | Database (UI) | ✅ Yes | Database → Env Default |
| MID (Merchant ID) | Database (UI) | ✅ Yes | Database → Env Default |
| TID (Terminal ID) | Database (UI) | ✅ Yes | Database → Env Default |
| Connection Type | Database (UI) | ✅ Yes | Database → Env Default |
| Timeout | Database (UI) | ✅ Yes | Database → Env Default |
| Test Mode | Database (UI) | ✅ Yes | Database → Env Default |

**Key Takeaway**: For Store-Based terminals, configure everything through the UI. Environment variables are optional defaults only.

---

## Quick Reference

```env
# Minimal .env for Store-Based Terminals
# (All terminal config is in database via UI)

PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/pos-system
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CLIENT_URL=http://localhost:5173

# Optional Verifone defaults (not required for Store-Based terminals)
# VERIFONE_TEST_MODE=false
```





