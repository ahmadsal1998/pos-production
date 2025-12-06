# Multi-Database Architecture - Preparation Guide

This guide outlines everything you need to prepare before implementing the multi-database architecture for your POS system.

## 📋 Prerequisites Checklist

### 1. MongoDB Atlas Configuration

#### Option A: Single Cluster with Multiple Databases (Recommended)
If you're using MongoDB Atlas, you can create all 5 databases in the same cluster:

**Steps:**
1. Log into your MongoDB Atlas account
2. Navigate to your cluster
3. Click "Browse Collections"
4. Create the following databases manually (or they'll be created automatically on first connection):
   - `pos_db_1`
   - `pos_db_2`
   - `pos_db_3`
   - `pos_db_4`
   - `pos_db_5`

**Note:** The system will automatically create these databases when stores are created, but pre-creating them allows you to:
- Set up proper access controls
- Configure backups
- Monitor database sizes

#### Option B: Multiple Clusters (For Higher Isolation)
If you want complete isolation, you can create 5 separate clusters, but this requires:
- 5 separate connection strings
- More complex connection management
- Higher costs

**Recommendation:** Use Option A (single cluster, multiple databases) for cost efficiency and easier management.

### 2. Environment Variables Setup

#### Current Setup
Your `MONGODB_URI` should point to your main database (where Store registry is kept).

**Example Atlas URI:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/main_db?retryWrites=true&w=majority
```

#### What Happens
- The system will automatically derive connection strings for `pos_db_1` through `pos_db_5` by replacing the database name
- All databases will use the same credentials and cluster
- No additional environment variables needed

#### Verification
Test your connection string format:
```bash
# Your base URI should work with any database name
mongodb+srv://username:password@cluster.mongodb.net/[ANY_DB_NAME]?retryWrites=true&w=majority
```

### 3. Database Access & Permissions

#### Required Permissions
Ensure your MongoDB user has:
- ✅ **Read/Write** access to all databases
- ✅ Permission to create new databases (if auto-creating)
- ✅ Permission to create collections

#### Network Access
- ✅ Whitelist your server IP addresses in Atlas Network Access
- ✅ Or use `0.0.0.0/0` for development (not recommended for production)

### 4. Existing Data Migration Strategy

#### If You Have Existing Stores

**Current Situation:**
- All stores are in a single database
- Store records are in the main database's `stores` collection
- Store-specific data (products, orders, etc.) are in prefixed collections

**Migration Steps:**

1. **Backup Everything First**
   ```bash
   # Backup your current database
   mongodump --uri="your_connection_string" --out=./backup_before_migration
   ```

2. **Update Store Records**
   - Add `databaseId` field to existing Store documents
   - Distribute stores across databases (1-5)
   - Example script provided below

3. **Migrate Store Collections**
   - Move collections from main DB to assigned databases
   - Collections to move: `{prefix}_products`, `{prefix}_orders`, `{prefix}_categories`, `{prefix}_users`, `{prefix}_brands`

4. **Verify Data Integrity**
   - Check all stores are accessible
   - Verify collection counts match
   - Test store operations

#### Migration Script Template

Create a migration script (`backend/src/utils/migrateStores.ts`):

```typescript
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Store from '../models/Store';
import { getDatabaseConnection, DATABASE_CONFIG } from './databaseManager';

dotenv.config();

const migrateExistingStores = async () => {
  try {
    // Connect to main database
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to main database');

    // Get all existing stores
    const stores = await Store.find({});
    console.log(`📊 Found ${stores.length} stores to migrate`);

    // Distribute stores across databases
    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      const databaseId = Math.floor(i / DATABASE_CONFIG.STORES_PER_DATABASE) + 1;
      const finalDatabaseId = Math.min(databaseId, DATABASE_CONFIG.DATABASE_COUNT);

      // Update store with databaseId
      store.databaseId = finalDatabaseId;
      await store.save();

      console.log(`✅ Store "${store.name}" assigned to database ${finalDatabaseId}`);

      // TODO: Migrate collections (see detailed migration below)
    }

    console.log('✅ Migration completed');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

// Run migration
migrateExistingStores();
```

### 5. Backup Strategy

#### Before Migration
1. **Full Database Backup**
   ```bash
   mongodump --uri="your_connection_string" --out=./backup_$(date +%Y%m%d)
   ```

2. **Export Store Registry**
   ```bash
   mongoexport --uri="your_connection_string" --collection=stores --out=stores_backup.json
   ```

#### After Implementation
Set up automated backups for each database:
- **Atlas Automated Backups:** Enable for your cluster
- **Manual Backups:** Schedule regular backups of all 5 databases
- **Point-in-Time Recovery:** Consider enabling for production

### 6. Testing Plan

#### Pre-Implementation Testing
1. **Test Database Connections**
   - Verify all 5 databases can be connected
   - Test connection pooling
   - Check timeout settings

2. **Test Store Creation**
   - Create a test store
   - Verify it's assigned to correct database
   - Verify collections are created

3. **Test Data Access**
   - Create products in a store
   - Create categories
   - Create brands
   - Verify data isolation

#### Post-Implementation Testing
1. **Load Testing**
   - Test with multiple stores
   - Verify performance across databases
   - Check connection pool usage

2. **Failover Testing**
   - Test database connection failures
   - Verify graceful error handling
   - Test reconnection logic

### 7. Monitoring Setup

#### Metrics to Monitor
- **Connection Count:** Per database
- **Database Size:** Track growth of each database
- **Query Performance:** Monitor slow queries
- **Error Rates:** Track connection errors

#### Atlas Monitoring
- Set up alerts for:
  - High connection count
  - Database size approaching limits
  - Slow queries
  - Connection failures

### 8. Code Changes Required

#### Already Implemented ✅
- Database manager utility
- Store model with `databaseId` field
- Updated brand and category models
- Updated admin controller
- Lazy database connection loading

#### What You Need to Do
1. **Update Existing Store Records** (if any)
   - Add `databaseId` to existing stores
   - Run migration script

2. **Test the System**
   - Create a new store
   - Verify database assignment
   - Test data operations

3. **Update Documentation**
   - Document which stores are in which database
   - Update runbooks with database information

### 9. Rollback Plan

#### If Issues Occur
1. **Immediate Rollback**
   - Restore from backup
   - Revert code changes
   - Point application back to single database

2. **Partial Rollback**
   - Keep new stores in distributed databases
   - Move problematic stores back to main database
   - Update `databaseId` accordingly

### 10. Production Deployment Checklist

Before deploying to production:

- [ ] All 5 databases created in Atlas
- [ ] Backup of current database completed
- [ ] Migration script tested on staging
- [ ] All existing stores have `databaseId` assigned
- [ ] Store collections migrated (if applicable)
- [ ] Monitoring and alerts configured
- [ ] Team trained on new architecture
- [ ] Rollback plan documented
- [ ] Performance benchmarks established
- [ ] Load testing completed

## 🚀 Quick Start (No Existing Stores)

If you're starting fresh with no existing stores:

1. **Set Environment Variable**
   ```bash
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/main_db?retryWrites=true&w=majority
   ```

2. **Start the Server**
   ```bash
   npm run dev
   ```

3. **Create Your First Store**
   - Use the admin API to create a store
   - System will automatically:
     - Assign database (databaseId: 1)
     - Create collections in `pos_db_1`
     - Set up store structure

4. **Verify**
   - Check Atlas: You should see `pos_db_1` database created
   - Check collections: `{prefix}_products`, `{prefix}_orders`, etc.

## 📝 Important Notes

### Database Naming
- Databases are named: `pos_db_1`, `pos_db_2`, `pos_db_3`, `pos_db_4`, `pos_db_5`
- This is configurable in `DATABASE_CONFIG.DATABASE_PREFIX`

### Store Distribution
- Stores are distributed evenly: 20 stores per database
- Assignment is automatic based on store count
- First 20 stores → `pos_db_1`
- Next 20 stores → `pos_db_2`
- And so on...

### Data Isolation
- Each store's data is completely isolated
- No cross-store data access
- Perfect for multi-tenant security

### Performance
- Connections are lazy-loaded (only when needed)
- Connection pooling per database
- Optimized for Atlas connections

## 🆘 Support & Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Increase `serverSelectionTimeoutMS` in databaseManager.ts
   - Check Atlas network access settings

2. **Database Not Found**
   - Databases are created automatically on first use
   - Verify connection string format

3. **Store Not Found**
   - Ensure `databaseId` is set in Store record
   - Check store prefix matches

### Getting Help
- Check logs for specific error messages
- Verify MongoDB Atlas dashboard for connection status
- Review `MULTI_DATABASE_ARCHITECTURE.md` for architecture details

## ✅ Final Checklist Before Starting

- [ ] MongoDB Atlas cluster ready
- [ ] Environment variable `MONGODB_URI` configured
- [ ] Database access permissions verified
- [ ] Backup of existing data (if applicable)
- [ ] Migration plan documented (if applicable)
- [ ] Testing environment prepared
- [ ] Team briefed on new architecture
- [ ] Monitoring setup ready

---

**Ready to proceed?** Once all items are checked, you can start using the multi-database system. The implementation is already complete in the codebase - you just need to prepare your MongoDB environment!

