# Hybrid Invoice Number Allocation Implementation

## Overview

This document describes the hybrid invoice number allocation system that provides immediate invoice numbers for pending sales while maintaining sequential numbering.

## Architecture

### Components

1. **InvoiceCounterService** (`frontend/src/lib/invoiceCounter/invoiceCounterService.ts`)
   - Local counter for immediate invoice number assignment
   - Initializes from backend current invoice number
   - Provides immediate invoice numbers without backend calls

2. **Sale Queue Integration**
   - Sales are queued with immediately assigned invoice numbers
   - Backend confirms/resolves conflicts during processing
   - Isolated sale contexts maintain invoice numbers throughout lifecycle

## Key Features

### Immediate Invoice Number Assignment

- Each new sale (even if added to a pending hold) immediately gets the next sequential invoice number
- No backend API call required for invoice number assignment
- Invoice numbers are visible to cashiers immediately

### Backend Conflict Resolution

- Backend confirms the invoice number when the sale is finalized
- Rare conflicts (e.g., concurrent POS terminals) are resolved using backend sequence
- Backend uses atomic operations to prevent duplicates
- Retry logic handles conflicts automatically (up to 3 retries)

### Integration with Sale Queue

- Fully compatible with Sale Queue + Isolated Sale Context model
- Invoice numbers are assigned immediately when sales are created
- Sales are queued with their invoice numbers for sequential backend processing
- Pending/hold invoices do not block the invoice number sequence

## Implementation Details

### Invoice Counter Service

The `InvoiceCounterService` maintains a local counter that:
- Initializes from backend's current invoice number on page load
- Falls back to IndexedDB if backend is unavailable
- Provides `getNextInvoiceNumber()` for immediate assignment (increments counter)
- Provides `getCurrentInvoiceNumber()` for display (does not increment)

### POS Page Integration

The POS page:
- Initializes the counter on mount using `invoiceCounterService.initialize()`
- Uses `getNextInvoiceNumber()` when finalizing sales
- Uses `getCurrentInvoiceNumber()` for new cart display
- Updates all sale creation paths (finalizeSale, startNewSale, handleHoldSale, handleRestoreSale, handleReturn, handleReSale)

### Backend Processing

The backend:
- Receives sales with pre-assigned invoice numbers
- Validates invoice number uniqueness
- Generates new numbers if conflicts are detected (with retry logic)
- Returns confirmed invoice numbers in responses

## Benefits

✅ **Immediate invoice numbers** - Cashiers see correct invoice numbers immediately, even for held sales

✅ **No conflicts in sequence** - Pending/hold invoices don't block invoice number sequence

✅ **Fully compatible** - Works seamlessly with Sale Queue + Isolated Sale Context model

✅ **Improved throughput** - No waiting for backend API calls for invoice numbers

✅ **Better UX** - Users see invoice numbers immediately, improving workflow

✅ **Conflict resolution** - Backend handles rare conflicts automatically

## Flow Example

1. **Page Load**
   - Counter initializes from backend: `currentNumber = 100` (last invoice was INV-100)

2. **New Sale Created**
   - User starts new sale: Cart shows `INV-101` (from `getCurrentInvoiceNumber()`)
   - Counter remains at 100

3. **Sale Finalized**
   - `getNextInvoiceNumber()` called: Counter increments to 101, returns `INV-101`
   - Sale is queued with `INV-101`
   - New cart created: Shows `INV-102` (counter is now at 101)

4. **Backend Processing**
   - Sale with `INV-101` is processed
   - Backend confirms `INV-101` (or resolves conflict if needed)
   - Sale marked as confirmed

5. **Rapid Sales**
   - Multiple sales can be created quickly
   - Each gets the next sequential number immediately
   - Backend processes them sequentially in the queue

## Conflict Handling

If a conflict occurs (rare, e.g., concurrent POS terminals):

1. Backend detects duplicate invoice number
2. Backend generates new invoice number using atomic sequence
3. Sale is saved with new invoice number
4. Frontend receives confirmed invoice number in response
5. Sale is marked as synced with the confirmed number

The local counter continues to work independently. Minor drift is acceptable and will be corrected on next page load.

## Testing Recommendations

1. Test rapid sale creation with multiple sales in quick succession
2. Test pending/hold sales to ensure invoice numbers are assigned immediately
3. Test offline scenarios to verify fallback behavior
4. Test concurrent POS terminals (if applicable) to verify conflict resolution
5. Verify invoice number sequence remains sequential

