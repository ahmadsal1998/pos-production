# Multi-Database Architecture Documentation

## Overview

This POS system implements a distributed multi-database architecture to efficiently manage 100 stores across 5 databases. Each database contains approximately 20 stores, with each store having separate collections for its data.

## Architecture Design

### Database Distribution

- **Total Stores**: 100 stores
- **Databases**: 5 databases (`pos_db_1` through `pos_db_5`)
- **Stores per Database**: ~20 stores per database
- **Distribution Strategy**: Round-robin based on store creation order

### Database Structure

#### Main Database (Default Connection)
- **Purpose**: Centralized management and metadata
- **Collections**:
  - `stores` - Store registry with database assignments
  - `users` - System/admin users (storeId = null)
  - Other shared/system collections

#### Distributed Databases (pos_db_1 through pos_db_5)
Each database contains store-specific collections:
- `{prefix}_products` - Products for the store
- `{prefix}_orders` - Orders for the store
- `{prefix}_categories` - Categories for the store
- `{prefix}_users` - Store-specific users (optional, currently in main DB)
- `{prefix}_brands` - Brands for the store

## Key Components

### 1. Database Manager (`src/utils/databaseManager.ts`)

Manages connections to multiple databases and determines store assignments.

**Key Functions:**
- `determineDatabaseForStore(StoreModel)` - Assigns a new store to the appropriate database
- `getDatabaseConnection(databaseId)` - Gets connection to a specific database
- `getDatabaseIdForStore(storeId, StoreModel)` - Retrieves database ID for an existing store
- `initializeAllDatabases()` - Initializes all database connections at startup

**Configuration:**
```typescript
export const DATABASE_CONFIG = {
  STORES_PER_DATABASE: 20,
  DATABASE_COUNT: 5,
  DATABASE_PREFIX: 'pos_db',
};
```

### 2. Store Model (`src/models/Store.ts`)

Updated to include `databaseId` field:
```typescript
{
  storeId: string;
  name: string;
  prefix: string;
  databaseId: number; // 1-5
}
```

### 3. Store Collections Utility (`src/utils/storeCollections.ts`)

Updated to work with multiple databases:
- `getStoreModel(prefix, collectionType, schema, databaseId)` - Gets model for store collection in specific database
- `createStoreCollections(prefix, databaseId)` - Creates all required collections for a store
- `ensureCollectionExists(prefix, collectionType, databaseId)` - Ensures collection exists

### 4. Brand & Category Models

Updated utilities (`brandModel.ts`, `categoryModel.ts`) to:
- Accept `databaseId` parameter
- Use correct database connection
- Automatically resolve database ID from storeId when not provided

## Store Creation Process

When creating a new store:

1. **Determine Database Assignment**
   ```typescript
   const databaseId = await determineDatabaseForStore(Store);
   ```
   - Counts existing stores
   - Calculates: `Math.floor(totalStores / 20) + 1`
   - Ensures max of 5 databases

2. **Create Store Record**
   ```typescript
   const store = await Store.create({
     name,
     storeId,
     prefix,
     databaseId, // Assigned database
   });
   ```

3. **Create Store Collections**
   ```typescript
   await createStoreCollections(prefix, databaseId);
   ```
   - Creates: products, orders, categories, users collections
   - All in the assigned database

## Accessing Store Data

### Getting Store-Specific Models

**Brands:**
```typescript
const Brand = await getBrandModelForStore(storeId);
// Automatically resolves databaseId and uses correct connection
```

**Categories:**
```typescript
const Category = await getCategoryModelForStore(storeId);
// Automatically resolves databaseId and uses correct connection
```

### Direct Database Access

```typescript
import { getDatabaseConnection, getDatabaseIdForStore } from './utils/databaseManager';

const databaseId = await getDatabaseIdForStore(storeId, Store);
const connection = await getDatabaseConnection(databaseId);
const db = connection.db;
```

## Environment Configuration

The system uses a single `MONGODB_URI` environment variable. The database manager automatically:
- Extracts the base connection string
- Appends the appropriate database name (`pos_db_1`, `pos_db_2`, etc.)
- Maintains connection pooling for each database

**Example:**
```
MONGODB_URI=mongodb://user:pass@host:27017/main_db?options
```

Will create connections to:
- `mongodb://user:pass@host:27017/pos_db_1?options`
- `mongodb://user:pass@host:27017/pos_db_2?options`
- etc.

## Benefits

1. **Performance**: Distributes load across 5 databases
2. **Scalability**: Easy to add more databases as stores grow
3. **Isolation**: Store data is completely isolated
4. **Backup Management**: Each database can be backed up independently
5. **Maintenance**: Easier to manage smaller, focused databases

## Migration Notes

### Existing Stores

If you have existing stores in a single database:
1. They will continue to work (backward compatible)
2. New stores will be assigned to distributed databases
3. Consider migrating existing stores by:
   - Updating Store records with `databaseId`
   - Moving collections to appropriate databases
   - Updating any hardcoded database references

### Users

Currently, users are stored in the main database with a `storeId` field. To fully distribute:
1. Move store-specific users to store databases
2. Keep system/admin users (storeId = null) in main database
3. Update authentication to query across databases

## Monitoring

### Connection Status

```typescript
import { getConnectionCount } from './utils/databaseManager';

const activeConnections = getConnectionCount();
console.log(`Active database connections: ${activeConnections}`);
```

### Database Assignment

Check store distribution:
```typescript
const storesByDb = await Store.aggregate([
  { $group: { _id: '$databaseId', count: { $sum: 1 } } }
]);
```

## Troubleshooting

### Connection Issues

If a database connection fails:
- Check MongoDB URI format
- Verify database permissions
- Check network connectivity
- Review connection pool settings

### Store Not Found

If `getDatabaseIdForStore` returns null:
- Verify store exists in Store collection
- Check storeId/prefix spelling
- Ensure databaseId field is set

### Collection Access Errors

If you get errors accessing collections:
- Verify databaseId is correct
- Check collection exists in target database
- Ensure connection to database is established

## Future Enhancements

1. **Automatic Rebalancing**: Redistribute stores if databases become unbalanced
2. **Database Health Monitoring**: Track connection health and performance
3. **Cross-Database Queries**: Support queries across multiple databases
4. **User Distribution**: Move store users to store-specific databases
5. **Read Replicas**: Add read replicas for better performance

