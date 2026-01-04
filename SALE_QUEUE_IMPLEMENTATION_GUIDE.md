# Sale Queue Implementation Guide

## Overview

This document describes the queue-based sale processing model implementation based on the TDR (Technical Decision Record).

## Architecture

### Components

1. **SaleQueueService** (`frontend/src/lib/saleQueue/saleQueueService.ts`)
   - FIFO queue for sequential sale processing
   - Manages sale lifecycle states
   - Provides queue status updates

2. **IsolatedSaleContext**
   - UUID-based sale identifier
   - Isolated cart state per sale
   - Lifecycle state tracking

### Sale Lifecycle

```
CREATED → QUEUED → PROCESSING → CONFIRMED | FAILED
```

## Integration Steps

### 1. Import the Queue Service

```typescript
import { saleQueueService, IsolatedSaleContext } from '@/lib/saleQueue/saleQueueService';
```

### 2. Refactor finalizeSaleWithoutTerminal

Key changes:
- Remove strict locking (isSubmittingInvoiceRef, isProcessingPayment checks)
- Create isolated sale context with UUID
- Queue the sale instead of processing immediately
- Create new cart immediately after queueing (not after processing)
- Show receipt immediately with queue status

### 3. Update UI

- Show queue status (e.g., "Processing...", "Queued (2 sales waiting)")
- Allow multiple sales to be created rapidly
- Display queue length indicator

## Benefits

✅ No lost sales - queue guarantees processing
✅ No cart conflicts - isolated contexts per sale
✅ Improved throughput - cashiers can process sales faster
✅ Better UX - immediate feedback, no blocking

## Migration Notes

The current implementation uses strict locking. The queue-based approach:
- Removes the need for isSubmittingInvoiceRef checks
- Allows immediate cart creation after queueing
- Processes sales sequentially in the background

