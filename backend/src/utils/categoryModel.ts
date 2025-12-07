import mongoose, { Schema, Model, Document, Connection } from 'mongoose';
import Store from '../models/Store';
import { getDatabaseConnection, getDatabaseIdForStore, getDatabaseName } from './databaseManager';

// Category document interface (without storeId since we use separate collections)
export interface CategoryDocument extends Document {
  name: string;
  description?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Category schema definition (without storeId since we use separate collections)
const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Add indexes for performance
categorySchema.index({ name: 1 }, { unique: true });
categorySchema.index({ createdAt: -1 }); // For sorting by creation date

/**
 * Get the store prefix from storeId
 * @param storeId - Store ID (can be the prefix itself or the storeId field)
 * @returns Store prefix or throws error if not found
 */
export async function getStorePrefix(storeId: string | null | undefined): Promise<string> {
  if (!storeId) {
    throw new Error('Store ID is required');
  }

  const normalizedStoreId = storeId.toLowerCase().trim();
  console.log('🔍 getStorePrefix - Looking up store for storeId:', normalizedStoreId);

  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    console.error('❌ getStorePrefix - Database not connected. ReadyState:', mongoose.connection.readyState);
    throw new Error('Database connection not available. Please try again later.');
  }

  try {
    // First, try to find store by prefix (in case storeId is already a prefix)
    const storeByPrefix = await Store.findOne({ prefix: normalizedStoreId }).lean();
    if (storeByPrefix) {
      console.log('✅ getStorePrefix - Found store by prefix:', storeByPrefix.prefix);
      return storeByPrefix.prefix;
    }

    // Then try to find by storeId field
    const store = await Store.findOne({ storeId: normalizedStoreId }).lean();
    if (store) {
      console.log('✅ getStorePrefix - Found store by storeId field, prefix:', store.prefix);
      return store.prefix;
    }

    // If not found, check if it's a valid prefix format and use it
    // This handles cases where storeId might be the prefix itself
    if (/^[a-z0-9_]+$/.test(normalizedStoreId)) {
      console.log('⚠️ getStorePrefix - Store not found in DB, but valid format. Using as prefix:', normalizedStoreId);
      return normalizedStoreId;
    }

    console.error('❌ getStorePrefix - Store not found for storeId:', normalizedStoreId);
    throw new Error(`Store not found for storeId: ${storeId}. Please ensure your account is associated with a valid store.`);
  } catch (error: any) {
    console.error('❌ getStorePrefix - Error:', {
      message: error.message,
      stack: error.stack,
      storeId: normalizedStoreId,
    });
    // If it's already a formatted error message, throw it as is
    if (error.message.includes('Store not found') || error.message.includes('Database connection')) {
      throw error;
    }
    // Otherwise, wrap it with more context
    throw new Error(`Failed to get store prefix: ${error.message}`);
  }
}

/**
 * Get a Mongoose model for a store-specific Category collection
 * @param prefix - Store prefix (e.g., 'store1')
 * @param databaseId - Database ID where the collection is stored
 * @returns Mongoose model for the store-specific Category collection
 */
export async function getCategoryModel(
  prefix: string | null,
  databaseId?: number
): Promise<Model<CategoryDocument>> {
  if (!prefix) {
    // Return default model for system categories (if needed) - use main connection
    const defaultCollectionName = 'categories';
    if (mongoose.models[defaultCollectionName]) {
      return mongoose.models[defaultCollectionName] as Model<CategoryDocument>;
    }
    return mongoose.model<CategoryDocument>(defaultCollectionName, categorySchema, defaultCollectionName);
  }

  // If databaseId is not provided, we need to get it from the Store model
  let finalDatabaseId: number | null | undefined = databaseId;
  if (!finalDatabaseId) {
    finalDatabaseId = await getDatabaseIdForStore(prefix, Store);
    if (!finalDatabaseId) {
      throw new Error(`Database ID not found for store with prefix: ${prefix}`);
    }
  }

  // At this point, finalDatabaseId is guaranteed to be a number
  const dbId: number = finalDatabaseId;
  
  // Validate and sanitize prefix
  const sanitizedPrefix = prefix.toLowerCase().trim();
  if (!sanitizedPrefix || !/^[a-z0-9_]+$/.test(sanitizedPrefix)) {
    throw new Error(`Invalid store prefix: ${prefix}. Prefix can only contain lowercase letters, numbers, and underscores.`);
  }
  
  const collectionName = `${sanitizedPrefix}_categories`;
  
  // Validate collection name (MongoDB restrictions)
  if (collectionName.length > 255) {
    throw new Error(`Collection name too long: ${collectionName}. Maximum length is 255 characters.`);
  }
  
  // Get the connection for this database
  const connection = await getDatabaseConnection(dbId);
  
  // Verify the connection's database name
  const connectionDbName = connection.db?.databaseName;
  if (connectionDbName && connectionDbName !== getDatabaseName(dbId)) {
    console.warn(`⚠️ Database name mismatch: Expected ${getDatabaseName(dbId)}, got ${connectionDbName}`);
  }
  
  // Check if model already exists in this connection
  if (connection.models[collectionName]) {
    return connection.models[collectionName] as Model<CategoryDocument>;
  }

  // Create new model with the collection name on the specific connection
  return connection.model<CategoryDocument>(collectionName, categorySchema, collectionName);
}

/**
 * Get Category model for a user's store
 * @param storeId - User's storeId
 * @returns Mongoose model for the user's store Category collection
 */
export async function getCategoryModelForStore(storeId: string | null | undefined): Promise<Model<CategoryDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access categories');
  }
  
  const prefix = await getStorePrefix(storeId);
  const databaseId = await getDatabaseIdForStore(storeId, Store);
  
  if (!databaseId) {
    throw new Error(`Database ID not found for store: ${storeId}`);
  }
  
  return getCategoryModel(prefix, databaseId);
}

