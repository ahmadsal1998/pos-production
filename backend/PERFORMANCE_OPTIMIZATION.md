# Performance Optimization & Store-Specific Data Access

This document outlines the performance improvements and store-specific data access optimizations implemented to speed up operations while maintaining strict store-level data isolation.

## 🎯 Goals Achieved

1. ✅ **Store Selection/Identification**: Every operation now knows the storeId it belongs to
2. ✅ **Store-Specific Access**: All CRUD operations are limited to the store's own data
3. ✅ **Performance Optimizations**: Added indexes and caching to speed up queries
4. ✅ **Data Isolation**: Each store's data remains fully isolated
5. ✅ **Backward Compatibility**: All existing functionality continues to work

## 🚀 Key Improvements

### 1. Store-User Mapping Cache

**File**: `backend/src/utils/storeUserCache.ts`

A new in-memory cache system that stores mappings between user identifiers (email, username) and their storeId. This dramatically speeds up login and password reset operations by avoiding searches across all store collections.

**Features**:
- Caches email → storeId mappings
- Caches username → storeId mappings
- Automatic cache expiration (1 hour TTL)
- Cache invalidation on user create/update/delete
- Cache statistics for monitoring

**Usage**:
```typescript
import { getStoreIdForEmail, cacheEmailToStore } from '../utils/storeUserCache';

// Get cached storeId
const storeId = getStoreIdForEmail('user@example.com');

// Cache a mapping
cacheEmailToStore('user@example.com', 'store1');
```

### 2. Optimized User Search

**File**: `backend/src/utils/userModel.ts`

The `findUserAcrossStores` function has been optimized to:
- Use cache lookups first (if email/username is known)
- Accept an optional `storeIdHint` parameter to search in a specific store first
- Skip already-searched stores in the loop
- Cache results after successful lookups

**Before**: Searched all stores sequentially
**After**: Uses cache → searches hint store → searches remaining stores

### 3. Enhanced Login with Store Selection

**File**: `backend/src/controllers/auth.controller.ts`

Login now supports an optional `storeId` parameter:
```json
{
  "emailOrUsername": "user@example.com",
  "password": "password123",
  "storeId": "store1"  // Optional: speeds up login if provided
}
```

**Benefits**:
- If `storeId` is provided, search starts in that store (much faster)
- If not provided, uses cache to find the store
- Falls back to searching all stores only if cache miss

### 4. Database Indexes

Added indexes on key fields to speed up queries:

**User Collections**:
- `email` (single field index)
- `username` (single field index)
- `status` (for filtering active/inactive users)
- `storeId` + `email` (compound unique index)
- `storeId` + `username` (compound unique index)

**Brand Collections**:
- `name` (unique index)
- `createdAt` (for sorting)

**Category Collections**:
- `name` (unique index)
- `createdAt` (for sorting)

### 5. Store Isolation Middleware

**Files**: 
- `backend/src/middleware/storeIsolation.middleware.ts`
- `backend/src/routes/brands.routes.ts`
- `backend/src/routes/categories.routes.ts`

Added `requireStoreAccess` middleware to brand and category routes to ensure:
- Non-admin users must have a storeId
- All operations are automatically scoped to the user's store
- Admin users bypass restrictions

### 6. Cache Management in User Operations

**File**: `backend/src/controllers/users.controller.ts`

User create, update, and delete operations now:
- Cache email/username → storeId mappings on create
- Invalidate and update cache on update
- Invalidate cache on delete

This ensures the cache stays in sync with the database.

### 7. Optimized Password Reset

**File**: `backend/src/controllers/auth.controller.ts`

Password reset operations now:
- Accept optional `storeId` parameter
- Use cache to find user's store quickly
- Cache the user after successful reset

## 📊 Performance Impact

### Before Optimization:
- **Login**: Searched all stores sequentially (O(n) where n = number of stores)
- **Password Reset**: Searched all stores sequentially
- **User Lookups**: No caching, always searched all stores

### After Optimization:
- **Login with storeId**: Direct lookup in specific store (O(1))
- **Login with cache hit**: Direct lookup in cached store (O(1))
- **Login with cache miss**: Searches stores but caches result for next time
- **Password Reset**: Same optimizations as login

### Expected Performance Gains:
- **First login**: Similar to before (cache miss)
- **Subsequent logins**: **10-100x faster** (cache hit)
- **Login with storeId**: **10-100x faster** (direct lookup)
- **User operations**: **2-5x faster** (indexes on email/username)

## 🔒 Security & Data Isolation

All optimizations maintain strict data isolation:

1. **Store-Specific Collections**: Each store's data is in separate collections
2. **Middleware Enforcement**: `requireStoreAccess` middleware ensures non-admin users can only access their store
3. **Controller-Level Checks**: All controllers verify storeId matches requester's store
4. **Cache Validation**: Cache only stores valid storeId mappings, never cross-store data

## 📝 API Changes

### Login Endpoint

**Before**:
```json
POST /api/auth/login
{
  "emailOrUsername": "user@example.com",
  "password": "password123"
}
```

**After** (backward compatible):
```json
POST /api/auth/login
{
  "emailOrUsername": "user@example.com",
  "password": "password123",
  "storeId": "store1"  // Optional: speeds up login
}
```

### Forgot Password Endpoint

**Before**:
```json
POST /api/auth/forgot-password
{
  "email": "user@example.com"
}
```

**After** (backward compatible):
```json
POST /api/auth/forgot-password
{
  "email": "user@example.com",
  "storeId": "store1"  // Optional: speeds up lookup
}
```

### Reset Password Endpoint

**Before**:
```json
POST /api/auth/reset-password
{
  "email": "user@example.com",
  "newPassword": "newpass123"
}
```

**After** (backward compatible):
```json
POST /api/auth/reset-password
{
  "email": "user@example.com",
  "newPassword": "newpass123",
  "storeId": "store1"  // Optional: speeds up lookup
}
```

## 🛠️ Implementation Details

### Cache Invalidation Strategy

The cache is invalidated when:
1. User is created → Cache new mapping
2. User is updated → Invalidate old mapping, cache new mapping
3. User is deleted → Invalidate mapping
4. User's storeId changes → Invalidate old mapping, cache new mapping

### Cache Expiration

- **TTL**: 1 hour (configurable in `storeUserCache.ts`)
- **Automatic cleanup**: Expired entries are removed on access
- **Manual cleanup**: `clearCache()` function available

### Index Creation

Indexes are created automatically when:
- User model is first accessed for a store
- Brand model is first accessed for a store
- Category model is first accessed for a store

MongoDB will create these indexes on first use, so there's no migration needed.

## 🔍 Monitoring

### Cache Statistics

You can monitor cache performance:
```typescript
import { getCacheStats } from '../utils/storeUserCache';

const stats = getCacheStats();
console.log(`Email cache: ${stats.emailCacheSize} entries`);
console.log(`Username cache: ${stats.usernameCacheSize} entries`);
```

### Database Indexes

Check indexes in MongoDB:
```javascript
// In MongoDB shell
db.getCollection('store1_users').getIndexes();
db.getCollection('store1_brands').getIndexes();
db.getCollection('store1_categories').getIndexes();
```

## ✅ Testing Checklist

- [x] Login with storeId parameter works
- [x] Login without storeId (uses cache) works
- [x] Login with cache miss (searches all stores) works
- [x] Password reset with storeId works
- [x] Password reset without storeId (uses cache) works
- [x] User create caches email/username
- [x] User update invalidates and updates cache
- [x] User delete invalidates cache
- [x] Store isolation middleware works for brands
- [x] Store isolation middleware works for categories
- [x] Indexes are created automatically
- [x] Backward compatibility maintained

## 🚨 Important Notes

1. **Cache is in-memory**: Cache is lost on server restart. This is acceptable as it will rebuild on first access.

2. **Cache TTL**: 1 hour TTL means if a user's storeId changes, it may take up to 1 hour for the cache to reflect the change. However, cache is invalidated on user updates, so this is not an issue.

3. **Index Creation**: Indexes are created lazily on first access. For production, consider creating indexes proactively during deployment.

4. **Store Selection**: The frontend can optionally send `storeId` in login requests if the user has previously logged in. This is a performance optimization, not a requirement.

## 📚 Related Documentation

- `MULTI_DATABASE_PREPARATION.md` - Multi-database architecture
- `STORE_ISOLATION_IMPLEMENTATION.md` - Store isolation details
- `backend/src/middleware/storeIsolation.middleware.ts` - Middleware implementation

## 🔄 Future Enhancements

Potential future improvements:
1. **Redis Cache**: Replace in-memory cache with Redis for multi-instance deployments
2. **Index Pre-creation**: Create indexes proactively during store creation
3. **Cache Warming**: Pre-populate cache on server startup
4. **Metrics Collection**: Add detailed performance metrics for cache hit/miss rates

---

**Last Updated**: 2024
**Version**: 1.0.0

