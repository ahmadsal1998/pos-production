# Trial Account Data Purge Guide

This guide explains how to safely purge all data related to trial/free accounts without impacting production data.

## Overview

Trial accounts use special `_test` collections (e.g., `products_test`, `customers_test`, `sales_test`) to keep test data separate from production. This utility allows you to safely delete:

- All test collections (`*_test`)
- Trial store records
- Associated users
- All related data

**Safety Features:**
- ✅ Only affects stores with `isTrialAccount = true`
- ✅ Never touches production collections
- ✅ Dry-run mode by default
- ✅ Requires explicit confirmation
- ✅ Detailed logging and reporting

## Methods

### 1. Command Line Script (Recommended for Bulk Operations)

#### Preview What Will Be Deleted (Dry-Run)
```bash
npm run purge-trials
```

This shows:
- Number of trial accounts found
- Documents in each test collection
- Associated users
- Estimated data size

#### Purge All Trial Accounts
```bash
npm run purge-trials -- --confirm
```

⚠️ **Warning:** This permanently deletes all trial account data!

#### Purge Specific Trial Account
```bash
npm run purge-trials -- --store-id=store1 --confirm
```

### 2. Admin API Endpoints (For Web Interface)

#### Get Purge Report (Dry-Run)
```http
GET /api/admin/trial-accounts/purge-report
Authorization: Bearer <admin_token>
```

Response:
```json
{
  "success": true,
  "data": {
    "report": {
      "storesFound": 3,
      "storesToDelete": [...],
      "collectionsToPurge": ["products_test", "customers_test", ...],
      "totalDocumentsToDelete": {
        "products_test": 150,
        "customers_test": 25,
        ...
      },
      "estimatedSize": "2.45 MB"
    },
    "message": "This is a dry-run report. No data has been deleted."
  }
}
```

#### Purge All Trial Accounts
```http
POST /api/admin/trial-accounts/purge
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "confirm": true
}
```

#### Purge Specific Trial Account
```http
POST /api/admin/trial-accounts/{storeId}/purge
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "confirm": true
}
```

**Without `confirm: true`, this endpoint returns a dry-run report.**

## What Gets Deleted

### Test Collections (All Documents)
- `products_test`
- `customers_test`
- `sales_test`
- `categories_test`
- `brands_test`
- `warehouses_test`
- `units_test`
- `payments_test`
- `settings_test`
- `merchants_test`

### Store Records
- All stores where `isTrialAccount = true`

### Users
- All users associated with trial accounts (where `storeId` matches a trial account)

## Safety Checklist

Before purging:

1. ✅ **Backup Database** (if needed)
   ```bash
   mongodump --uri="your_connection_string" --out=./backup
   ```

2. ✅ **Run Dry-Run First**
   ```bash
   npm run purge-trials
   ```

3. ✅ **Verify Report**
   - Check that only trial accounts are listed
   - Verify no production stores are included
   - Review document counts

4. ✅ **Confirm Deletion**
   - Only proceed if you're certain
   - Use `--confirm` flag or `confirm: true` in API

5. ✅ **Monitor Results**
   - Check logs for any errors
   - Verify collections are empty
   - Confirm stores are deleted

## Example Workflow

```bash
# 1. Preview what will be deleted
npm run purge-trials

# Output shows:
# - 3 trial accounts found
# - 500 documents in products_test
# - 50 documents in customers_test
# - etc.

# 2. If everything looks correct, proceed with deletion
npm run purge-trials -- --confirm

# 3. Verify deletion
# Check that test collections are empty
# Verify trial stores are removed
```

## Error Handling

The utility will:
- Continue processing even if some collections fail
- Log all errors for review
- Return success status with error details
- Never delete production data (only `isTrialAccount = true` stores)

## Recovery

If you accidentally delete something:
1. Restore from database backup
2. Recreate trial accounts if needed
3. Test data can be regenerated

## Best Practices

1. **Regular Cleanup**: Schedule periodic purges of expired trial accounts
2. **Automation**: Consider automating purges for accounts older than X days
3. **Monitoring**: Track trial account creation and usage
4. **Documentation**: Keep records of what was purged and when

## Troubleshooting

### "No trial accounts found"
- Verify stores have `isTrialAccount = true` in database
- Check store records: `db.stores.find({ isTrialAccount: true })`

### "Collection not found"
- This is normal - collections are only created when first document is inserted
- Empty collections are skipped automatically

### "Permission denied"
- Ensure you're using admin credentials
- Check database user has delete permissions

## Security Notes

- Only admin users can access purge endpoints
- All operations are logged
- Dry-run mode is default (requires explicit confirmation)
- Production collections are never touched (only `_test` collections)

