# POS Product Synchronization Implementation

## Overview

This document describes the implementation of a product synchronization system for the POS that keeps a local copy for fast searching while ensuring quantities are always up-to-date.

## Problem Statement

Previously, if products were stored in local state or localStorage and searches were performed only from there, any updates to product quantities on the server would not be reflected immediately in the POS. This meant that if stock changed (sales, returns, or manual adjustments), the local copy would become outdated.

## Solution

The implementation provides:

1. **Local Copy for Fast Searching**: Products are cached locally for instant search performance
2. **Automatic Synchronization**: Local copy is synchronized with the server after any quantity changes
3. **Server-Side Query Option**: For critical operations, the system can query the server directly to get the latest stock

## Implementation Details

### 1. Product Synchronization Utility (`frontend/src/lib/sync/productSync.ts`)

A new utility class `ProductSyncManager` provides:

- **`syncProducts()`**: Syncs all products from server and updates cache
- **`syncSpecificProducts()`**: Syncs only specific products by ID (for targeted updates)
- **`syncAfterQuantityChange()`**: Automatically syncs products after stock changes
- **`queryProductFromServer()`**: Queries server directly for a product (bypasses cache)
- **`queryProductsFromServer()`**: Queries multiple products from server

Key features:
- Cooldown mechanism to prevent excessive API calls
- Cache management integration
- Error handling and logging
- Non-blocking background syncs

### 2. POS Page Integration (`frontend/src/pages/sales/POSPage.tsx`)

The POS page now:

- **Imports the sync utility**: Uses `productSync` for all synchronization needs
- **Syncs after sales**: Automatically syncs affected products after a sale is finalized
- **Syncs after returns**: Automatically syncs affected products after a return is processed
- **Server-side stock checks**: Optional server-side stock verification for critical operations
- **Visibility change handling**: Syncs products when the page becomes visible (catches changes from other tabs)
- **Storage event handling**: Syncs products when cache is invalidated in other tabs

### 3. Key Features

#### Automatic Sync After Quantity Changes

After a sale or return is completed, the system:
1. Extracts product IDs from the invoice items
2. Calls `productSync.syncAfterQuantityChange()` with those IDs
3. Updates local product state with fresh stock data
4. Updates the cache for future use

#### Server-Side Stock Checks

For critical operations (like adding products to cart), you can optionally query the server directly:

```typescript
// In handleAddProduct, you can now pass useServerStockCheck = true
handleAddProduct(product, unit, undefined, undefined, undefined, true);
```

This will:
1. Query the server for the latest stock
2. Update local state with fresh data
3. Perform stock validation using the latest data

#### Visibility Change Sync

When the POS page becomes visible (user switches back to the tab), the system:
1. Automatically syncs products from the server
2. Updates local state with fresh stock data
3. Ensures quantities are up-to-date even if changes happened in other tabs

## Usage Examples

### Manual Sync

```typescript
// Sync all products
const result = await productSync.syncProducts({ forceRefresh: true });

// Sync specific products
const result = await productSync.syncProducts({ 
  productIds: ['product-id-1', 'product-id-2'] 
});
```

### Query Server Directly

```typescript
// Get latest stock for a product
const product = await productSync.queryProductFromServer('product-id');
const stock = product?.stock || 0;
```

### Automatic Sync (Already Integrated)

The sync happens automatically after:
- Sales are finalized
- Returns are processed
- Page becomes visible
- Cache is invalidated

## Benefits

1. **Fast Performance**: Local cache enables instant searches
2. **Always Up-to-Date**: Automatic sync ensures quantities are current
3. **Flexible**: Can query server directly for critical operations
4. **Efficient**: Only syncs affected products after changes
5. **Multi-Tab Support**: Syncs when switching between tabs

## Technical Notes

- Sync operations are non-blocking (don't delay the UI)
- Cache has a 5-minute TTL (configurable in `productsCache.ts`)
- Sync cooldown prevents excessive API calls (1 second between syncs)
- Error handling ensures the POS continues to work even if sync fails
- Local state is updated optimistically and then synced in the background

## Future Enhancements

Potential improvements:
- WebSocket support for real-time updates
- Batch sync operations for better performance
- Configurable sync intervals
- Sync status indicators in the UI
- Conflict resolution for concurrent updates

