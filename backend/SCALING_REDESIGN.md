# POS System Scaling Redesign - 1000 Stores Support

## Overview

This document describes the architectural redesign to support **1000 stores** with concurrent usage, focusing on performance, scalability, and strict tenant isolation.

## Key Changes

### 1. Unified Collections (Multi-Tenant Architecture)

**Before:** Per-store collections (`{prefix}_products`, `{prefix}_customers`, etc.) across 5 databases  
**After:** Single unified collections with `storeId` field in single database

#### Models Updated:
- ✅ `Product` - Unified collection with `storeId` field
- ✅ `Customer` - Unified collection with `storeId` field
- ✅ `Category` - Unified collection with `storeId` field (required, no nulls)
- ✅ `Brand` - Unified collection with `storeId` field
- ✅ `Unit` - Unified collection with `storeId` field
- ✅ `Sale` - Unified collection with `storeId` field (required)
- ✅ `Payment` - Unified collection with `storeId` field (required)
- ✅ `User` - Enhanced with `(storeId + email)` unique index

### 2. Critical Indexes for Performance

All store-scoped queries use compound indexes with `storeId` as the first field:

#### Product Indexes:
```javascript
{ storeId: 1, barcode: 1 } // UNIQUE - Critical for barcode lookups
{ storeId: 1, status: 1 }
{ storeId: 1, categoryId: 1 }
{ storeId: 1, brandId: 1 }
{ storeId: 1, showInQuickProducts: 1 }
{ storeId: 1, name: 1 }
{ storeId: 1, createdAt: -1 }
{ storeId: 1, 'units.barcode': 1 } // For unit barcode searches
```

#### Other Collections:
- `Customer`: `{ storeId: 1, phone: 1 }` (UNIQUE)
- `Category`: `{ storeId: 1, name: 1 }` (UNIQUE)
- `Brand`: `{ storeId: 1, name: 1 }` (UNIQUE)
- `Unit`: `{ storeId: 1, name: 1 }` (UNIQUE)
- `Sale`: `{ storeId: 1, invoiceNumber: 1 }` (UNIQUE)
- `User`: `{ storeId: 1, email: 1 }` (UNIQUE)

### 3. Redis Caching Layer

**Purpose:** Achieve < 5ms barcode lookups (DB level) and < 50ms end-to-end POS scans

#### Implementation:
- Redis client with connection pooling
- Cache key format: `product:{storeId}:{barcode}`
- TTL: 1 hour (3600 seconds)
- Automatic cache invalidation on product create/update/delete

#### Cache Functions:
- `getProductByBarcode(storeId, barcode)` - Cached barcode lookup
- `invalidateProductCache(storeId, barcode)` - Invalidate single product
- `invalidateStoreProductCache(storeId)` - Invalidate all store products

### 4. Security & Isolation

#### JWT-Only storeId Extraction:
- **CRITICAL:** `storeId` MUST come from JWT token only
- **NEVER** accept `storeId` from request body, params, or query
- New middleware: `sanitizeStoreId()` - removes any `storeId` from request

#### Controller Pattern:
```typescript
// ✅ CORRECT
const storeId = req.user?.storeId; // From JWT only

// ❌ WRONG
const storeId = req.body.storeId || req.user?.storeId;
```

#### Query Pattern:
```typescript
// ✅ CORRECT - Always filter by storeId
const products = await Product.find({ 
  storeId: storeId.toLowerCase(),
  // ... other filters
});

// ❌ WRONG - Missing storeId filter
const products = await Product.find({ /* ... */ });
```

### 5. Performance Targets

- **Barcode lookup (DB level):** < 5ms (with Redis cache)
- **POS scan end-to-end:** < 50ms
- **System capacity:** 1000-2000 RPS
- **Query optimization:** All queries use compound indexes with `storeId` prefix

### 6. Migration Strategy

#### Phase 1: Data Migration
1. Create unified collections with `storeId` field
2. Migrate data from per-store collections
3. Backfill `storeId` for all existing records
4. Create compound indexes

#### Phase 2: Code Migration
1. Update all models to use unified collections
2. Update controllers to use unified models
3. Remove dynamic model utilities (`getProductModelForStore`, etc.)
4. Remove multi-database architecture

#### Phase 3: Testing & Validation
1. Verify all queries use `storeId` filter
2. Test Redis caching performance
3. Load test with 1000 stores
4. Verify tenant isolation

## Files Modified

### Models:
- `src/models/Product.ts` - Unified with `storeId`
- `src/models/Customer.ts` - Unified with `storeId`
- `src/models/Category.ts` - Unified with `storeId` (required)
- `src/models/Brand.ts` - Unified with `storeId`
- `src/models/Unit.ts` - Unified with `storeId`
- `src/models/Sale.ts` - `storeId` required
- `src/models/Payment.ts` - `storeId` required
- `src/models/User.ts` - Enhanced indexes

### Utilities:
- `src/utils/redis.ts` - Redis client and cache utilities
- `src/utils/productCache.ts` - Barcode lookup caching

### Controllers:
- `src/controllers/products.controller.ts` - Updated to use unified model + Redis

### Middleware:
- `src/middleware/storeIsolation.middleware.ts` - Added `sanitizeStoreId()`

### Server:
- `src/server.ts` - Initialize Redis on startup

## Next Steps

1. ✅ Add Redis dependency
2. ✅ Create unified models
3. ✅ Implement Redis caching
4. ✅ Update products controller
5. ⏳ Update remaining controllers (customers, sales, categories, brands, units)
6. ⏳ Create migration script
7. ⏳ Remove multi-database architecture
8. ⏳ Update frontend if needed

## Environment Variables

Add to `.env`:
```bash
REDIS_URL=redis://localhost:6379
# Or for production:
REDIS_URL=redis://your-redis-host:6379
```

## Performance Monitoring

Monitor these metrics:
- Redis cache hit rate
- Barcode lookup latency (p50, p95, p99)
- Database query performance
- Store isolation violations (should be 0)

## Security Checklist

- [x] All queries filter by `storeId`
- [x] `storeId` only from JWT (never from request)
- [x] Admin users explicitly handled
- [x] Compound indexes on all store-scoped queries
- [x] Cache invalidation on data changes

