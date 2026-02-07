# POS Data Synchronization

This document describes when sync runs, what is synced, how conflicts and partial failures are handled, offline behavior, and incremental sync.

## When sync runs

| Trigger | What runs | Entry point |
|--------|------------|-------------|
| **Login** | Full products + customers sync (force refresh) | `runSyncOnLogin(storeId)` from auth store after successful login |
| **POS / main store view load** | Same full sync can be triggered manually (e.g. "Refresh" or via `useStoreDataSync`) | `useStoreDataSync(storeId).runSync()` or `runSyncOnLogin(storeId)` |
| **Manual refresh** | User-triggered retry after sync failure; same as login sync | `retrySync()` from auth store or `runSyncOnLogin(storeId)` |
| **Back online** | Unsynced sales and unsynced stock changes are sent to the backend | `salesSync.triggerSync()` and `inventorySync.triggerSync()` on `window.addEventListener('online')` and `document.addEventListener('visibilitychange')` (when tab becomes visible and online) |

Sync for products and customers is serialized through a **sync queue** (`syncQueue`) so only one store-data sync runs at a time. Cooldowns in product/customer sync managers avoid overlapping full syncs when multiple callers trigger in quick succession.

## What is synced

- **Products:** Fetched from backend (paginated or full via `all=true`), stored in IndexedDB (`productsDB`). Barcode lookup can use IndexedDB first.
- **Customers:** Fetched from backend (paginated), stored in IndexedDB (`customersDB`).
- **Sales:** Created locally (e.g. in POS) are stored in IndexedDB with `synced: false`. When online, `salesSync` sends unsynced sales to the backend and marks them synced (see Offline below).
- **Stock changes:** Unsynced inventory changes are queued and synced when online via `inventorySync`.

## Conflicts and partial failures

- **Product or customer sync failure on login:**  
  `runSyncOnLogin` returns `{ success: false, productError?, customerError? }`. The app still allows usage; the auth store records the error so the UI can show "Data may be outdated" and a **Retry** button. Partial success (e.g. products OK, customers failed) is reflected in the same result; both are attempted every time.

- **Sales – invoice number conflict (409):**  
  If the backend returns 409 (e.g. duplicate invoice number), the sale is marked with a sync error in IndexedDB. The UI can retry; the backend may assign a new invoice number on success, which is then stored via `markAsSynced(..., savedInvoiceNumber)` so the local record stays aligned with the server.

- **Sales – already synced (e.g. another tab/device):**  
  If the backend indicates the sale already exists (e.g. by invoice number), the sync layer can mark the local record as synced with the server-assigned ID instead of treating it as a hard failure.

- **Queue:**  
  Only one store-data sync task runs at a time. If a task fails, the queue continues with the next; the failed run’s result is still reported to the caller (e.g. auth store or `useStoreDataSync`).

## Offline behavior

- **Sales created offline** are stored in IndexedDB as `SaleRecord` with `synced: false`. They keep a **local temp ID** and a **local invoice number** (generated on the client).
- **When the app is back online**, `salesSync` is triggered (by `online` and `visibilitychange`). It loads unsynced sales from IndexedDB and sends them to the backend one by one.
- **Server-generated IDs and invoice numbers:**  
  The backend creates the sale and returns its `id` and optionally a final `invoiceNumber`. The client calls `salesDB.markAsSynced(sale.id, backendId, storeId, invoiceNumber, savedInvoiceNumber)`. So:
  - Local temp ID remains the IndexedDB key; the **backend ID** is stored (e.g. `_id`) and used for future reference.
  - If the server returns a different invoice number (e.g. after resolving a duplicate), it is saved so the local record matches the server and future syncs don’t resend the same sale.

So: **offline sales are queued in IndexedDB; when back online they are sent in order; local temp IDs are kept for storage; server ID and invoice number are stored when the backend responds.**

## Incremental sync

- **Products:**  
  The backend supports `modifiedSince` (ISO date). The frontend stores a **last sync timestamp** per store in localStorage (`productsDB.getLastSyncAt()` / `setLastSyncAt()`). When not doing a force refresh, product sync first tries an incremental request with `modifiedSince: lastSyncAt`. If that returns changes, it merges them into IndexedDB and updates the last sync time. If incremental fails or returns no changes, it falls back to full sync as needed. Full sync updates the last sync time after a successful run.

- **Customers:**  
  The backend does not yet support `modifiedSince` for customers. Customers are always fully refetched (paginated). When the backend adds a "modified since" or "last sync" parameter, the frontend can add a similar last-sync timestamp and incremental flow for customers to reduce payload size and sync time for large stores.

## Errors and UI

- If sync fails on login (or on manual run), the app still allows usage. The auth store (or sync hook) keeps the last sync result.
- The UI should show **"Data may be outdated"** or **"Sync failed"** when the last sync failed, and provide a **Retry** action that runs the same sync again (e.g. `runSyncOnLogin(storeId)` or `retrySync()`). On success, the error state is cleared.
