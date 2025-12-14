# Product Search Optimization for High-Scale POS System

## Overview

This document describes the optimization strategy for fast product search in a POS system with **100 stores** and **100,000 products** (1,000 products per store on average).

## Architecture Approach

### Single Unified Collection with Store Isolation

**Strategy**: Use a single `products` collection with each product linked to a `storeId` field.

**Benefits**:
- Simple and scalable architecture
- Easy to manage and maintain
- Efficient querying with compound indexes
- All products in one place for analytics and reporting

## Critical Database Indexes

All indexes use `storeId` as the first field to enable efficient filtering and querying:

### Primary Barcode Index (MOST CRITICAL)
```javascript
{ storeId: 1, barcode: 1 } // UNIQUE
```
- **Purpose**: Fast barcode lookups (critical path for POS scans)
- **Query Pattern**: `db.products.find({ storeId: "store1", barcode: "123456" })`
- **Performance**: < 5ms with index, even with 100,000 products
- **Unique Constraint**: Ensures no duplicate barcodes per store

### Unit Barcode Index
```javascript
{ storeId: 1, 'units.barcode': 1 }
```
- **Purpose**: Search products by secondary unit barcodes
- **Query Pattern**: `db.products.find({ storeId: "store1", 'units.barcode': "789012" })`

### Name Search Index
```javascript
{ storeId: 1, name: 1 }
```
- **Purpose**: Fast name-based searches and sorting
- **Query Pattern**: `db.products.find({ storeId: "store1", name: { $regex: "search" } })`

### SKU Search Index
```javascript
{ storeId: 1, internalSKU: 1 }
```
- **Purpose**: Fast SKU-based searches
- **Query Pattern**: `db.products.find({ storeId: "store1", internalSKU: { $regex: "SKU123" } })`

### Status Filter Index
```javascript
{ storeId: 1, status: 1 }
```
- **Purpose**: Filter active/inactive products efficiently
- **Query Pattern**: `db.products.find({ storeId: "store1", status: "active" })`

### Category/Brand Indexes
```javascript
{ storeId: 1, categoryId: 1 }
{ storeId: 1, brandId: 1 }
```
- **Purpose**: Filter products by category or brand

### Quick Products Index
```javascript
{ storeId: 1, showInQuickProducts: 1 }
```
- **Purpose**: Fast retrieval of frequently used products
- **Query Pattern**: `db.products.find({ storeId: "store1", showInQuickProducts: true })`

### Sorting Index
```javascript
{ storeId: 1, createdAt: -1 }
```
- **Purpose**: Efficient sorting by creation date (newest first)

## Query Optimization Patterns

### ✅ Correct: Filter by storeId First

**All product queries MUST filter by `storeId` as the first condition:**

```javascript
// ✅ CORRECT - Uses compound index efficiently
const product = await Product.findOne({
  storeId: storeId.toLowerCase(),  // FIRST - uses index
  barcode: trimmedBarcode          // SECOND - completes compound index
});
```

### ❌ Incorrect: Missing storeId Filter

```javascript
// ❌ WRONG - Scans entire collection
const product = await Product.findOne({
  barcode: trimmedBarcode  // No storeId = full collection scan
});
```

## Redis Caching Strategy

### Cache Key Format
```
product:{storeId}:{barcode}
```

### Caching Benefits
- **Cache Hit**: < 5ms lookup time
- **Cache Miss**: < 50ms (indexed database query + cache write)
- **TTL**: 1 hour (3600 seconds)

### Cache Implementation
- **Location**: `backend/src/utils/productCache.ts`
- **Functions**:
  - `getProductByBarcode(storeId, barcode)` - Cached barcode lookup
  - `invalidateProductCache(storeId, barcode)` - Invalidate on update/delete
  - `invalidateStoreProductCache(storeId)` - Invalidate all store products (bulk operations)

## Performance Targets

### Barcode Lookup (POS Critical Path)
- **Target**: < 50ms end-to-end (including network)
- **Database Level**: < 5ms (with cache: < 1ms)
- **Achieved Through**:
  1. Compound index `{ storeId: 1, barcode: 1 }`
  2. Redis caching layer
  3. Always filter by `storeId` first

### Product Listing
- **Target**: < 200ms for paginated results (20 items)
- **Achieved Through**:
  1. Compound indexes on filter fields
  2. Pagination (limit/skip)
  3. Field selection for quick product lists

## Implementation Details

### Product Model Location
`backend/src/models/Product.ts`

### All Indexes Defined
All indexes are defined in the Mongoose schema and automatically created by MongoDB when `autoIndex: true` is set in the connection options.

### Query Examples

#### Barcode Search (POS Scan)
```javascript
// Uses: { storeId: 1, barcode: 1 } index
const product = await getCachedProductByBarcode(storeId, barcode);
```

#### Name/Barcode/SKU Search (Product Listing)
```javascript
// Uses: { storeId: 1, name: 1 } and other indexes
const products = await Product.find({
  storeId: storeId.toLowerCase(),
  $or: [
    { name: { $regex: searchTerm, $options: 'i' } },
    { barcode: { $regex: searchTerm, $options: 'i' } },
    { internalSKU: { $regex: searchTerm, $options: 'i' } }
  ]
});
```

#### Active Products Only
```javascript
// Uses: { storeId: 1, status: 1 } index
const products = await Product.find({
  storeId: storeId.toLowerCase(),
  status: 'active'
});
```

## Scalability Notes

### Current Scale
- **100 stores** × **1,000 products** = **100,000 products**
- All indexes designed to handle this scale efficiently

### Future Scale (1,000 stores)
- **1,000 stores** × **1,000 products** = **1,000,000 products**
- Same indexes will perform efficiently (O(log n) with B-tree indexes)
- Consider sharding by `storeId` if needed (MongoDB sharding)

### Index Size Considerations
- Each compound index uses minimal storage (~5-10% of collection size)
- Total index overhead: ~50-100MB for 100,000 products
- Acceptable for fast query performance

## Monitoring and Maintenance

### Index Usage Monitoring
Use MongoDB's `explain()` to verify indexes are being used:

```javascript
db.products.find({ storeId: "store1", barcode: "123456" }).explain("executionStats")
```

### Index Maintenance
- Indexes are automatically maintained by MongoDB
- Monitor index size with `db.products.getIndexes()`
- Rebuild indexes if needed: `db.products.reIndex()`

### Cache Hit Rate
Monitor Redis cache hit rate to ensure caching is effective:
- Target: > 80% hit rate for frequently scanned products
- Low hit rate may indicate cache invalidation issues

## Best Practices

1. **Always filter by `storeId` first** in all product queries
2. **Use Redis caching** for frequently accessed products
3. **Use `.lean()`** for read-only queries (faster, returns plain objects)
4. **Use field selection** when only specific fields are needed
5. **Invalidate cache** on product create/update/delete operations
6. **Use pagination** for product listings (don't load all products at once)

## Migration Notes

If migrating from per-store collections:
1. All products should have `storeId` field
2. Create all indexes using `db.products.createIndex()`
3. Verify index usage with `explain()`
4. Monitor query performance

## Related Files

- Product Model: `backend/src/models/Product.ts`
- Product Controller: `backend/src/controllers/products.controller.ts`
- Product Cache: `backend/src/utils/productCache.ts`
- Database Config: `backend/src/config/database.ts`

