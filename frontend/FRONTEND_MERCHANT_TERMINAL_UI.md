# Merchant & Terminal Management UI

A comprehensive frontend interface for managing merchants and payment terminals in the POS system.

## Overview

The Merchant & Terminal Management UI provides a user-friendly interface to:
- Create and manage merchants
- Create and manage payment terminals
- Link terminals to merchants
- Test terminal connections
- Configure terminal settings (IP, port, connection type)
- Enable/disable test mode per terminal

## Access

**Route:** `/financial/merchant-terminals`

**Navigation:** Can be added to the settings menu or financial section

## Features

### Merchants Tab

1. **View All Merchants**
   - Table view showing all merchants
   - Displays: Name, Merchant ID (MID), Store ID, Status
   - Search functionality

2. **Create Merchant**
   - Form with required fields:
     - Name
     - Merchant ID (MID) - from payment processor
     - Store ID (optional)
     - Description (optional)
     - Status (Active/Inactive)

3. **Edit Merchant**
   - Update merchant information
   - Change status

4. **Delete Merchant**
   - Removes merchant (only if no terminals linked)
   - Confirmation dialog for safety

### Terminals Tab

1. **View All Terminals**
   - Table view showing all terminals
   - Displays:
     - Name
     - Terminal ID (TID)
     - IP Address
     - Port
     - Connection Type
     - Status
     - Test Mode indicator
   - Filter by merchant
   - Search functionality

2. **Create Terminal**
   - Form with required fields:
     - Merchant (dropdown selection)
     - Terminal ID (TID) - from payment processor
     - Name
     - IP Address
     - Port (default: 12000)
     - Connection Type (Ethernet/USB/Serial)
     - Status (Active/Inactive/Maintenance)
     - Test Mode (checkbox)
     - Timeout (default: 60000ms)
     - Description (optional)

3. **Edit Terminal**
   - Update terminal configuration
   - Change status
   - Enable/disable test mode

4. **Delete Terminal**
   - Removes terminal
   - Confirmation dialog

5. **Test Connection**
   - One-click connection test
   - Shows connection status
   - Updates terminal lastConnected/lastError fields

## UI Components

### Main Page
- Two-tab interface (Merchants / Terminals)
- Responsive design
- Dark mode support
- Loading states
- Error handling

### Merchant Form Modal
- Clean, intuitive form
- Required field validation
- Status dropdown
- Cancel/Save actions

### Terminal Form Modal
- Comprehensive form
- Merchant selection dropdown
- Connection type dropdown
- Test mode checkbox
- All terminal configuration options

### Tables
- Sortable columns
- Status badges (color-coded)
- Action buttons (Edit, Delete, Test)
- Responsive layout

## Usage Examples

### Creating a Merchant

1. Click "Add Merchant" button
2. Fill in the form:
   - Name: "Main Store Merchant"
   - Merchant ID: "MERCHANT001"
   - Store ID: "store1" (optional)
   - Status: "Active"
3. Click "Create"
4. Merchant appears in the table

### Creating a Terminal

1. Ensure at least one merchant exists
2. Switch to "Terminals" tab
3. Click "Add Terminal" button
4. Fill in the form:
   - Merchant: Select from dropdown
   - Terminal ID: "TERMINAL001"
   - Name: "Counter Terminal 1"
   - IP Address: "192.168.1.100"
   - Port: 12000
   - Connection Type: "Ethernet"
   - Status: "Active"
   - Test Mode: (unchecked for production)
5. Click "Create"
6. Terminal appears in the table

### Testing Terminal Connection

1. Find the terminal in the table
2. Click the connection test icon (🔌)
3. Wait for test result
4. Success message or error details displayed

### Filtering Terminals by Merchant

1. In Terminals tab
2. Use merchant dropdown filter
3. Select merchant or "All Merchants"
4. Table updates automatically

## Integration with Payment Processing

Once merchants and terminals are configured:

- **Automatic Routing:** Payments automatically route to correct terminal
- **Merchant Selection:** System uses merchant from invoice/store
- **Terminal Selection:** System selects active terminal for merchant
- **Connection:** Uses stored IP/port configuration

## API Integration

The UI uses the following APIs:

- `GET /api/merchants` - List merchants
- `POST /api/merchants` - Create merchant
- `PUT /api/merchants/:id` - Update merchant
- `DELETE /api/merchants/:id` - Delete merchant
- `GET /api/terminals` - List terminals
- `POST /api/terminals` - Create terminal
- `PUT /api/terminals/:id` - Update terminal
- `DELETE /api/terminals/:id` - Delete terminal
- `POST /api/terminals/:id/test` - Test connection

## Error Handling

- Form validation
- API error messages
- Connection test feedback
- Delete confirmations
- Loading states

## Future Enhancements

Potential improvements:
- Bulk import/export
- Terminal status dashboard
- Connection history logs
- Real-time status monitoring
- Terminal usage analytics

## File Location

**Component:** `frontend/src/pages/payments/MerchantTerminalManagementPage.tsx`

**Route:** Added to `/financial/merchant-terminals`

## Access the Page

After starting the frontend:
1. Navigate to `/financial/merchant-terminals`
2. Or add to navigation menu (see navigation setup)

The UI is ready to use for managing merchants and terminals!

