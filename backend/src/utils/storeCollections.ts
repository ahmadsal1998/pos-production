import mongoose, { Connection } from 'mongoose';
import { getDatabaseConnection, getDatabaseName } from './databaseManager';

/**
 * Get the collection name for a store-specific collection
 * @param prefix - Store prefix (e.g., 'store1')
 * @param collectionType - Type of collection (e.g., 'products', 'orders', 'customers')
 * @returns Collection name with prefix (e.g., 'store1_products')
 */
export function getStoreCollectionName(prefix: string, collectionType: string): string {
  return `${prefix.toLowerCase()}_${collectionType}`;
}

/**
 * Get a Mongoose model for a store-specific collection in a specific database
 * @param prefix - Store prefix
 * @param collectionType - Type of collection
 * @param schema - Mongoose schema to use
 * @param databaseId - Database ID where the collection should be created
 * @returns Mongoose model for the store-specific collection
 */
export async function getStoreModel<T extends mongoose.Document>(
  prefix: string,
  collectionType: string,
  schema: mongoose.Schema,
  databaseId: number
): Promise<mongoose.Model<T>> {
  const collectionName = getStoreCollectionName(prefix, collectionType);
  const dbName = getDatabaseName(databaseId);
  const modelKey = `${dbName}_${collectionName}`;
  
  // Get the connection for this database
  const connection = await getDatabaseConnection(databaseId);
  
  // Check if model already exists in this connection
  if (connection.models[collectionName]) {
    return connection.models[collectionName] as mongoose.Model<T>;
  }

  // Create new model with the collection name on the specific connection
  return connection.model<T>(collectionName, schema, collectionName);
}

/**
 * Get the database instance for a specific database
 * @param databaseId - Database ID (1-5)
 * @returns MongoDB database instance
 */
export async function getDatabase(databaseId: number) {
  const connection = await getDatabaseConnection(databaseId);
  return connection.db;
}

/**
 * Check if a collection exists for a store in a specific database
 * @param prefix - Store prefix
 * @param collectionType - Type of collection
 * @param databaseId - Database ID
 * @returns Promise<boolean> - True if collection exists
 */
export async function collectionExists(
  prefix: string,
  collectionType: string,
  databaseId: number
): Promise<boolean> {
  const db = await getDatabase(databaseId);
  if (!db) {
    return false;
  }

  const collectionName = getStoreCollectionName(prefix, collectionType);
  const collections = await db.listCollections({ name: collectionName }).toArray();
  return collections.length > 0;
}

/**
 * Create a collection for a store if it doesn't exist in a specific database
 * @param prefix - Store prefix
 * @param collectionType - Type of collection
 * @param databaseId - Database ID
 * @returns Promise<void>
 */
export async function ensureCollectionExists(
  prefix: string,
  collectionType: string,
  databaseId: number
): Promise<void> {
  const db = await getDatabase(databaseId);
  if (!db) {
    throw new Error(`Database connection not available for database ${databaseId}`);
  }

  const collectionName = getStoreCollectionName(prefix, collectionType);
  const exists = await collectionExists(prefix, collectionType, databaseId);

  if (!exists) {
    await db.createCollection(collectionName);
    const dbName = getDatabaseName(databaseId);
    console.log(`✅ Created collection: ${collectionName} in database ${dbName}`);
  }
}

/**
 * Create all required collections for a store in a specific database
 * @param prefix - Store prefix (used for products, orders, categories)
 * @param storeId - Store ID (used for users collection to match user.storeId field)
 * @param databaseId - Database ID
 * @returns Promise<void>
 */
export async function createStoreCollections(
  prefix: string,
  databaseId: number,
  storeId?: string
): Promise<void> {
  // Collections that use prefix (products, orders, categories)
  const prefixCollections = ['products', 'orders', 'categories'];
  
  for (const collectionType of prefixCollections) {
    try {
      await ensureCollectionExists(prefix, collectionType, databaseId);
    } catch (error: any) {
      console.error(`❌ Error creating collection ${collectionType} for store ${prefix}:`, error.message);
      // Continue with other collections even if one fails
    }
  }
  
  // Users collection uses storeId to match the user.storeId field
  if (storeId) {
    try {
      const usersCollectionName = `${storeId.toLowerCase()}_users`;
      const db = await getDatabase(databaseId);
      // Check if collection exists
      const collections = await db.listCollections({ name: usersCollectionName }).toArray();
      const exists = collections.length > 0;
      if (!exists) {
        await db.createCollection(usersCollectionName);
        const dbName = getDatabaseName(databaseId);
        console.log(`✅ Created collection: ${usersCollectionName} in database ${dbName}`);
      }
    } catch (error: any) {
      console.error(`❌ Error creating users collection for store ${storeId}:`, error.message);
      // Continue even if users collection creation fails - it will be created automatically when first user is inserted
    }
  }
  
  const dbName = getDatabaseName(databaseId);
  console.log(`✅ All collections created for store ${prefix} in database ${dbName}`);
}

