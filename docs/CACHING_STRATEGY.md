# Frontend Caching Strategy

This document describes when to read from **IndexedDB** vs **API**, and how **invalidation** works for products and related data. Bulk product/customer data uses **IndexedDB only**; **localStorage** is reserved for auth token, theme, and small UI state.

---

## 1. Data sources

| Data type | Primary storage | Backup / invalidation |
|-----------|-----------------|------------------------|
| **Products** | IndexedDB (`productsDB`) | API via `productSync.syncProducts()` |
| **Customers** | IndexedDB (`customersDB`) | API via `customerSync.syncCustomers()` |
| **Categories, units, brands** | IndexedDB (respective `*DB` modules) | API + sync on login |
| **Auth** | localStorage (Zustand persist) | — |
| **Theme / small UI state** | localStorage | — |

All cache keys (IndexedDB and in-memory) are **store-scoped** (by `storeId`) so one store never sees another store’s data.

---

## 2. When to read from IndexedDB vs API

### Products

- **On login / POS load:**  
  `runSyncOnLogin(storeId)` runs a full sync (products + customers). Data is written to IndexedDB. Subsequent reads use IndexedDB until refresh or invalidation.

- **On product list / POS pages:**  
  - **First read:** Prefer IndexedDB via `productSync.getCachedProducts()` (or `productsDB.getAllProducts()`).  
  - **Background refresh:** After showing cached data, optionally call the API and write results to IndexedDB so the next read is fresh.

- **When to call the API:**  
  - Manual refresh (user-triggered).  
  - After login (via `runSyncOnLogin`).  
  - When IndexedDB is empty or sync explicitly requests a refresh (e.g. `productSync.syncProducts({ forceRefresh: true })`).  
  - For barcode search on product list, the app may choose to always hit the API for fresh results; in-memory barcode cache is still invalidated so POS barcode lookups stay correct.

- **Barcode lookups (POS):**  
  `productsDB.getProductByBarcode(barcode)` uses an **in-memory cache** (store-scoped, short TTL, e.g. 2 minutes) then IndexedDB. This reduces IndexedDB reads during heavy scanning. The in-memory cache is cleared on product create/update/delete and on `productSync.invalidateCache()`.

### Customers

- Same idea: IndexedDB is the single source after sync; sync runs on login and when explicitly triggered. No product-style localStorage cache for customers.

---

## 3. Invalidation

- **After create/update/delete product:**  
  - Write (or remove) the product in IndexedDB via `productsDB.storeProduct` / `storeProducts` / `deleteProduct`.  
  - These methods clear the **in-memory barcode cache** for the current store.  
  - Optionally call `productSync.invalidateCache()` to clear in-memory barcode cache and any legacy localStorage product keys (if still used elsewhere).

- **Manual refresh:**  
  Call `productSync.syncProducts({ forceRefresh: true })` to refetch from API and overwrite IndexedDB (and optionally clear in-memory caches).

- **Logout:**  
  - IndexedDB is fully cleaned (e.g. `cleanupAllIndexedDB()`).  
  - `clearAllProductsCaches()` removes legacy `pos_products_cache_*` keys from localStorage so no product list remains in localStorage.

---

## 4. Summary

- **Single source for product/customer lists:** IndexedDB.  
- **localStorage:** Auth, theme, small UI state only; no product or customer lists.  
- **When to read from IndexedDB:** By default for list and barcode lookups after initial sync.  
- **When to call API:** On login, manual refresh, empty IndexedDB, or when a flow explicitly requires server data (e.g. strict barcode search on product list).  
- **Invalidation:** IndexedDB is updated (or cleared) on create/update/delete; in-memory barcode cache is store-scoped and cleared on product changes and on `productSync.invalidateCache()`; legacy product keys in localStorage are cleared on logout and on invalidate.
