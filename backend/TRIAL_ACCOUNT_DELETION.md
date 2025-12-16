# Trial Account Deletion vs User Deletion

## Critical Difference

### User Deletion (Regular)
- **ONLY removes the user account** from the `users` collection
- **ALL store data remains intact**: products, customers, sales, inventory, etc.
- Store operations continue normally
- Other users in the same store can still access all data
- **Purpose**: Remove a user account without affecting business operations

### Trial Account Deletion
- **Removes the ENTIRE store and ALL its data**
- Deletes ALL store-related data:
  - Products (from `products_test` collection)
  - Customers (from `customers_test` collection)
  - Sales/Invoices (from `sales_test` collection)
  - Categories (from `categories_test` collection)
  - Brands (from `brands_test` collection)
  - Warehouses (from `warehouses_test` collection)
  - Units (from `units_test` collection)
  - Payments (from `payments_test` collection)
  - Settings (from `settings_test` collection)
  - Merchants (from `merchants_test` collection)
- Deletes all users associated with the store
- Deletes the store record itself
- **Purpose**: Complete cleanup of trial/test accounts

## Implementation Details

### Data Isolation

Trial accounts use `_test` collections:
- `products` → `products_test` (for trial accounts)
- `customers` → `customers_test` (for trial accounts)
- `sales` → `sales_test` (for trial accounts)
- etc.

### Deletion Process

When deleting a trial account:

1. **Delete all data from test collections** (filtered by `storeId`)
   ```typescript
   await collection.deleteMany({ storeId: normalizedStoreId });
   ```

2. **Delete all users** associated with the store
   ```typescript
   await User.deleteMany({ storeId: normalizedStoreId });
   ```

3. **Delete the store record**
   ```typescript
   await Store.deleteOne({ _id: store._id });
   ```

### Safety Guarantees

✅ **Only trial accounts are affected** - `isTrialAccount = true` check
✅ **Only test collections are touched** - Never affects production data
✅ **Filtered by storeId** - Only deletes data for the specific trial store
✅ **Never affects production stores** - Production data is completely safe

## Example Scenarios

### Scenario 1: Delete Regular User
**Before:**
- Store "ABC" has 3 users: Manager, Cashier1, Cashier2
- Store "ABC" has 500 products, 200 customers, 1000 sales

**After deleting Cashier1:**
- Store "ABC" now has 2 users: Manager, Cashier2
- Store "ABC" still has 500 products, 200 customers, 1000 sales ✅
- All data remains accessible

### Scenario 2: Delete Trial Account
**Before:**
- Trial Store "TEST1" has 2 users: Manager, Cashier1
- Trial Store "TEST1" has 50 products, 20 customers, 30 sales (in `_test` collections)

**After deleting Trial Store "TEST1":**
- Trial Store "TEST1" deleted
- All 2 users deleted
- All 50 products deleted from `products_test`
- All 20 customers deleted from `customers_test`
- All 30 sales deleted from `sales_test`
- All other data deleted
- **Production stores remain completely unaffected** ✅

## Code Location

- **User Deletion**: `backend/src/controllers/users.controller.ts` → `deleteUser()`
- **Trial Account Deletion**: `backend/src/utils/purgeTrialAccounts.ts` → `purgeSpecificTrialAccount()` or `purgeTrialAccounts()`

## Safety Checklist

Before deleting a trial account:

1. ✅ Verify it's a trial account (`isTrialAccount = true`)
2. ✅ Run dry-run report to preview what will be deleted
3. ✅ Confirm no production data will be affected
4. ✅ Ensure you want to permanently delete ALL store data
5. ✅ Verify the storeId is correct

## Recovery

If you accidentally delete a trial account:
- Trial account data is meant to be disposable
- Can recreate the trial account if needed
- Test data can be regenerated
- **Production data is never affected**

## Best Practices

1. **Regular User Deletion**: Use when removing a user account but keeping the store
2. **Trial Account Deletion**: Use when completely removing a test/trial store
3. **Always use dry-run first**: Preview what will be deleted before confirming
4. **Verify storeId**: Double-check you're deleting the correct trial account

