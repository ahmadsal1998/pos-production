# Verifone VX990 Payment Terminal Integration

This document describes the integration of the Verifone VX990 payment terminal with the POS system.

## Overview

The integration enables automated payment processing when customers select Visa/Card payment on the POS system. The invoice amount is automatically sent to the terminal, and the POS system updates automatically based on the payment result.

## Features

- ✅ Automatic amount transmission to terminal
- ✅ Real-time payment status updates
- ✅ Support for Ethernet, USB, and Serial connections
- ✅ Test mode for development and testing
- ✅ Comprehensive error handling
- ✅ Transaction logging and audit trail

## Architecture

### Backend Components

1. **Payment Terminal Service** (`src/utils/verifoneVX990.ts`)
   - Handles TCP/IP communication with VX990 terminal
   - Implements ECR protocol
   - Supports connection management and timeout handling

2. **Payment Controller** (`src/controllers/payments.controller.ts`)
   - Processes payment requests
   - Manages payment status
   - Handles terminal responses

3. **Payment Model** (`src/models/Payment.ts`)
   - Stores payment transaction data
   - Tracks payment status and terminal responses

4. **Payment Routes** (`src/routes/payments.routes.ts`)
   - API endpoints for payment processing
   - Terminal status and discovery endpoints

### Frontend Components

1. **Payment Processing Modal** (`frontend/src/shared/components/ui/PaymentProcessingModal/`)
   - Displays payment processing status
   - Shows real-time updates from terminal
   - Handles payment success/error states

2. **POS Page Integration** (`frontend/src/pages/sales/POSPage.tsx`)
   - Integrates payment terminal when Card is selected
   - Handles payment flow automation

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# Verifone VX990 Terminal Configuration
VERIFONE_HOST=192.168.1.100          # Terminal IP address (Ethernet)
VERIFONE_PORT=12000                  # Terminal port (default: 12000)
VERIFONE_CONNECTION_TYPE=ethernet    # Connection type: ethernet, usb, or serial
VERIFONE_TIMEOUT=60000               # Payment timeout in milliseconds (default: 60000)
VERIFONE_TEST_MODE=true              # Enable test mode (true/false)
VERIFONE_MERCHANT_ID=YOUR_MERCHANT_ID
VERIFONE_TERMINAL_ID=YOUR_TERMINAL_ID
```

### Connection Types

#### Ethernet Connection (Recommended)

```env
VERIFONE_HOST=192.168.1.100
VERIFONE_PORT=12000
VERIFONE_CONNECTION_TYPE=ethernet
```

#### USB Connection

For USB connections, you may need to use IP over USB bridge:
- Install Verifone USB drivers
- Configure IP over USB in terminal settings
- Use bridge IP address (typically `192.168.1.1` or `127.0.0.1`)

#### Serial Connection

For serial connections, use a serial-to-TCP bridge or configure serial port directly.

## Test Mode

Test mode allows you to verify the integration without a physical terminal:

```env
VERIFONE_TEST_MODE=true
```

In test mode:
- Connection is simulated
- Payment responses are simulated (85% approval, 10% decline, 5% error)
- No actual terminal connection is required

### Testing Payment Scenarios

The test mode simulates different scenarios:
- **Approved**: Payment is approved with transaction ID and authorization code
- **Declined**: Payment is declined with error message
- **Error**: Terminal communication error

## API Endpoints

### Process Payment

**POST** `/api/payments/process`

Request:
```json
{
  "invoiceId": "INV-2024-ABCDE",
  "amount": 100.50,
  "currency": "SAR",
  "paymentMethod": "Card",
  "description": "Invoice INV-2024-ABCDE"
}
```

Response:
```json
{
  "success": true,
  "message": "Transaction approved",
  "data": {
    "payment": {
      "id": "payment_id",
      "invoiceId": "INV-2024-ABCDE",
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

### Get Terminal Status

**GET** `/api/payments/status`

Response:
```json
{
  "success": true,
  "data": {
    "status": {
      "connected": true,
      "ready": true,
      "terminalId": "TERMINAL-001",
      "merchantId": "MERCHANT-001"
    }
  }
}
```

### Discover Terminals

**GET** `/api/payments/discover`

Response:
```json
{
  "success": true,
  "data": {
    "terminals": [
      {
        "host": "192.168.1.100",
        "port": 12000,
        "info": {
          "terminalId": "TERMINAL-001",
          "merchantId": "MERCHANT-001"
        }
      }
    ]
  }
}
```

### Get Payment

**GET** `/api/payments/:id`

### Get Payments by Invoice

**GET** `/api/payments/invoice/:invoiceId`

### Cancel Payment

**POST** `/api/payments/:id/cancel`

## Usage Flow

1. **Customer selects items** on POS system
2. **Cashier selects "Visa" payment method**
3. **Cashier clicks "Confirm Payment"**
4. **Payment modal opens** and connects to terminal
5. **Amount is sent** automatically to terminal
6. **Customer completes payment** on terminal (insert card, enter PIN, etc.)
7. **Terminal response is captured** by POS system
8. **Invoice status updates** automatically:
   - Approved: Invoice marked as paid, receipt generated
   - Declined: Error message shown, retry option available
   - Error: Error message shown, retry option available

## Error Handling

The integration includes comprehensive error handling:

### Connection Errors
- Terminal not found/offline
- Network connectivity issues
- Timeout errors

### Payment Errors
- Declined transactions
- Insufficient funds
- Card errors
- Terminal communication errors

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "paymentId": "payment_id_if_created"
}
```

## Terminal Setup

### Initial Terminal Configuration

1. **Network Setup** (for Ethernet):
   - Configure terminal IP address
   - Set port to 12000 (or custom port)
   - Ensure POS system and terminal are on same network

2. **ECR Protocol Configuration**:
   - Enable ECR protocol on terminal
   - Configure terminal to accept JSON/XML commands
   - Set timeout values appropriately

3. **Merchant Configuration**:
   - Enter merchant ID
   - Configure terminal ID
   - Set up payment gateway credentials (if required)

### Testing Connection

1. Check terminal status:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/payments/status
   ```

2. Discover terminals on network:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/payments/discover
   ```

## Troubleshooting

### Terminal Not Connecting

1. **Check network connectivity**:
   ```bash
   ping 192.168.1.100  # Replace with your terminal IP
   ```

2. **Check port accessibility**:
   ```bash
   telnet 192.168.1.100 12000
   ```

3. **Verify firewall settings**:
   - Ensure port 12000 is open
   - Check if firewall is blocking connections

4. **Check terminal configuration**:
   - Verify IP address matches environment variable
   - Ensure ECR protocol is enabled
   - Check terminal is powered on and online

### Payment Timeouts

1. Increase timeout value:
   ```env
   VERIFONE_TIMEOUT=120000  # 2 minutes
   ```

2. Check network latency between POS and terminal

3. Verify terminal is responsive

### Payment Declined

1. Check terminal logs for detailed error codes
2. Verify card is valid and has sufficient funds
3. Check merchant account status
4. Review payment gateway logs

## Security Considerations

1. **Network Security**:
   - Use VPN or private network for terminal connection
   - Implement firewall rules
   - Use TLS/SSL if supported by terminal

2. **Authentication**:
   - All payment endpoints require authentication
   - Use JWT tokens for API access

3. **Data Protection**:
   - Payment data is encrypted in transit
   - Transaction IDs are logged, not full card data
   - Comply with PCI-DSS requirements

## Development

### Running in Test Mode

1. Set environment variable:
   ```env
   VERIFONE_TEST_MODE=true
   ```

2. No physical terminal required
3. Payment responses are simulated

### Local Development

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Set up environment variables
3. Start backend server:
   ```bash
   npm run dev
   ```

4. Test payment flow in frontend

## Production Deployment

1. **Disable test mode**:
   ```env
   VERIFONE_TEST_MODE=false
   ```

2. **Configure production terminal**:
   - Set correct terminal IP and port
   - Configure merchant and terminal IDs
   - Test connection before going live

3. **Monitor transactions**:
   - Review payment logs regularly
   - Set up alerts for failures
   - Monitor terminal connectivity

## Support

For terminal-specific issues:
- Contact Verifone support
- Refer to Verifone VX990 documentation
- Check Verifone Developer Portal

For integration issues:
- Review application logs
- Check terminal status endpoint
- Verify network connectivity

## Future Enhancements

- [ ] Support for refunds through terminal
- [ ] Multi-terminal support
- [ ] Enhanced error recovery
- [ ] Transaction reconciliation
- [ ] Batch payment processing
- [ ] Terminal health monitoring dashboard

