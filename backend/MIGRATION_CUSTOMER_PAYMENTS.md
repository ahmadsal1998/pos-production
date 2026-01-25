# Customer Payments Migration Guide

## Overview

This migration moves all customer payments from store-specific collections in distributed databases (`pos_db_1`, `pos_db_2`, etc.) to a unified collection in `admin_db`.

**Source Collections:**
- `1_customer_payments` in `pos_db_1`, `pos_db_2`, etc.
- `2_customer_payments` in `pos_db_1`, `pos_db_2`, etc.
- `3_customer_payments` in `pos_db_1`, `pos_db_2`, etc.
- `4_customer_payments` in `pos_db_1`, `pos_db_2`, etc.
- `5_customer_payments` in `pos_db_1`, `pos_db_2`, etc.
- `7_customer_payments` in `pos_db_1`, `pos_db_2`, etc.

**Target Collection:**
- `customer_payments` in `admin_db`

## Safety Features

✅ **No Data Deletion**: Original collections are kept intact as backup  
✅ **Detailed Logging**: Comprehensive logs of all operations  
✅ **Error Handling**: Continues processing even if individual documents fail  
✅ **Rollback Support**: Can rollback migrated data if needed  
✅ **Duplicate Detection**: Handles duplicate documents gracefully  

## Prerequisites

1. Ensure MongoDB connection is configured via `MONGODB_URI` environment variable
2. Ensure `admin_db` is accessible and connected
3. Ensure all distributed databases (`pos_db_1` through `pos_db_5`) are accessible
4. Backup your database (recommended before running migration)

## Running the Migration

### Option 1: Using npm script (Recommended)

```bash
npm run migrate:customer-payments
```

### Option 2: Direct execution

```bash
ts-node src/utils/migrateCustomerPayments.ts
```

## Migration Process

1. **Connection**: Connects to `admin_db` and all distributed databases
2. **Discovery**: Finds all `*_customer_payments` collections across all databases
3. **Mapping**: Maps collection names to storeIds using the Store model
4. **Migration**: Reads documents in batches and inserts into `admin_db.customer_payments`
5. **Validation**: Ensures `storeId` is set on all migrated documents
6. **Reporting**: Provides detailed statistics and error reports

## What Happens During Migration

- Documents are read in batches of 100 for efficiency
- Each document is transformed to include the correct `storeId`
- Documents are inserted into `admin_db.customer_payments`
- Duplicate documents are skipped (based on MongoDB unique indexes)
- Original collections remain untouched

## After Migration

### Verification Steps

1. **Check Migration Statistics**: Review the console output for:
   - Total documents read
   - Total documents migrated
   - Number of errors (if any)
   - Stores processed

2. **Verify Data in admin_db**:
   ```javascript
   // In MongoDB shell or Compass
   use admin_db
   db.customer_payments.countDocuments()
   db.customer_payments.find({ storeId: "store1" }).count()
   ```

3. **Compare Counts**: Verify that migrated count matches source collections:
   ```javascript
   // Example: Check store 1
   use pos_db_1
   db["1_customer_payments"].countDocuments()
   // Should match count in admin_db for storeId "1" or corresponding storeId
   ```

4. **Test Application**: Test the payment functionality in your application to ensure everything works correctly

### Cleanup (ONLY AFTER VERIFICATION)

⚠️ **IMPORTANT**: Only delete original collections after:
- ✅ Migration completed successfully
- ✅ Data verified in `admin_db`
- ✅ Application tested and working
- ✅ Written approval obtained

To delete original collections (example for store 1):
```javascript
// In MongoDB shell
use pos_db_1
db["1_customer_payments"].drop()
```

## Rollback

If you need to rollback the migration, you can use the rollback function. However, note that:

- Rollback data is stored in memory during migration
- For production, you may want to save rollback data to a file
- Rollback will delete migrated documents from `admin_db`
- Original collections remain intact

### Manual Rollback

If you need to rollback, you can identify migrated documents by:
- Checking the migration logs
- Using timestamps (if migration was recent)
- Using storeId filters

Example rollback query (use with extreme caution):
```javascript
// Delete all payments for a specific store (if needed)
use admin_db
db.customer_payments.deleteMany({ storeId: "store1" })
```

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify `MONGODB_URI` is set correctly
   - Check network connectivity
   - Ensure database credentials are correct

2. **Store Mapping Errors**
   - Verify Store model has correct data
   - Check that storeNumbers match collection names
   - Review migration logs for specific errors

3. **Duplicate Key Errors**
   - These are handled automatically
   - Documents that already exist are skipped
   - Check logs for details

4. **Missing storeId**
   - Migration attempts to extract storeId from collection name
   - Falls back to collection name if store not found
   - Review logs for warnings

### Getting Help

- Check migration logs for detailed error messages
- Review the `errors` array in migration statistics
- Verify Store model data is correct
- Ensure all databases are accessible

## Migration Statistics

After migration, you'll see output like:

```
=== Migration Summary ===
Total documents read: 1500
Total documents migrated: 1485
Total errors: 15
Stores processed: 5
Rollback data entries: 1485
```

## Code Changes

The following files were modified to support the new structure:

1. **`backend/src/utils/customerPaymentModel.ts`**
   - Updated to use `admin_db` instead of distributed databases
   - Simplified model retrieval (no longer needs databaseId)

2. **`backend/src/utils/databaseManager.ts`**
   - Added `getAdminDatabaseConnection()` helper function

3. **`backend/src/controllers/customers.controller.ts`**
   - Updated to use synchronous model retrieval
   - Ensures `storeId` is normalized in all queries

## Support

For issues or questions:
1. Review migration logs
2. Check error messages in statistics
3. Verify database connectivity
4. Ensure Store model data is correct

---

**Last Updated**: January 2026  
**Migration Script**: `backend/src/utils/migrateCustomerPayments.ts`
