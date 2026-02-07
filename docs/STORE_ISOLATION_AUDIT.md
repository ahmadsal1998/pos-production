# Store Isolation Audit

Store context is derived **only** from the JWT (`req.user?.storeId`) or server-derived data. Endpoints that filter by store do not trust `storeId` from request body or query for non-admin users.

---

## Summary

- **Store-scoped endpoints** (brands, categories, units, warehouses, customers, products, sales, payments, merchants, store account, store points, users) use `req.user?.storeId` (or the user record when storeId is not in the token). Store ID is never taken from `req.body` or `req.query` for non-admin users.
- **Admin users** may pass `storeId` in query (e.g. sales list/summary) or body (e.g. create merchant) to filter or assign a store; this is intentional and restricted to the Admin role.
- **Public endpoint:** `getPublicInvoice` is unauthenticated and accepts `storeId` in the query string to look up an invoice by `(invoiceNumber, storeId)`. This is by design for public invoice links; there is no JWT.

---

## Endpoints checked

| Area | Source of storeId | Notes |
|------|-------------------|--------|
| Brands, categories, units, warehouses, customers, products | `req.user?.storeId` or user record | No body/query storeId for filtering |
| Merchants | JWT for non-admin; body storeId overwritten with `userStoreId` for non-admin; Admin may pass body storeId | Correct |
| Payments | `req.user?.storeId` | Correct |
| Sales (getSales, getSalesSummary) | JWT for non-admin; Admin may pass `storeId` query param to filter | Correct |
| Sales (create, get by id, return, etc.) | JWT / server-derived | Correct |
| getPublicInvoice | `req.query.storeId` | Unauthenticated; storeId required to resolve invoice by number |
| Store account (getStoreAccount) | JWT for non-admin; Admin uses URL param `id` as store identifier | Correct |
| Store points (getStorePointsAccount) | JWT for non-admin; Admin uses URL param `id` | Correct |
| Users | `req.user?.storeId` for store-scoped listing | Correct |

---

## Recommendation

- Keep store context server-side only (JWT or server-derived). Do not add endpoints that accept `storeId` from body/query for non-admin store scoping.
- For `getPublicInvoice`, consider rate limiting or abuse protections if invoice numbers are guessable; storeId + invoiceNumber together limit exposure.
