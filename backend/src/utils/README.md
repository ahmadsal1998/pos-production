# Utils — Domain Helpers & Re-exports

This folder holds **domain helpers** used by services and controllers. Infrastructure (logging, cache, email, auth) lives in `src/infrastructure/` and is re-exported here for backward compatibility.

## Split by concern

| Location | Purpose | Examples |
|----------|---------|----------|
| **`src/infrastructure/`** | Cross-cutting: redis, logger, email, jwt, otp | Used by all layers |
| **`src/utils/`** | Domain helpers & store-aware models | productModel, saleModel, productCache, businessDate, categoryModel, customerModel, databaseManager, etc. |
| **`src/scripts/`** | One-off migrations and runners | migrateStores, migrateCustomerPayments, migrateTerminalsToStores, purgeTrialAccounts |

## Re-exports (infrastructure)

These files re-export from `../infrastructure/` so existing imports keep working. New code may import from `../infrastructure/` directly.

- `logger.ts` → `../infrastructure/logger`
- `redis.ts` → `../infrastructure/redis`
- `email.ts` → `../infrastructure/email`
- `jwt.ts` → `../infrastructure/jwt`
- `otp.ts` → `../infrastructure/otp`

## Domain helpers (stay here)

- **Models per store:** `productModel`, `saleModel`, `customerModel`, `customerPaymentModel`, `warehouseModel`, `unitModel`, `categoryModel`, `brandModel`
- **Cache & DB:** `productCache`, `databaseManager`, `storeCollections`, `storeUserCache`
- **Business rules:** `businessDate`, `subscriptionManager`, `checkUser`, `scaleBarcode`
- **Seeding / trials:** `seedDatabase`, `seedSettings`, `trialAccountModels`, `purgeTrialAccounts` (logic; runner in `scripts/`)

## Migrations

One-off migration **runners** are in `src/scripts/` (e.g. `scripts/migrateStores.ts`). They import migration logic and utils from here as needed.
