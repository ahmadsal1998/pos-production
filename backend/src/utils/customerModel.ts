import mongoose, { Schema, Model, Document, Connection } from 'mongoose';
import Store from '../models/Store';
import { getDatabaseConnection, getDatabaseIdForStore, getDatabaseName } from './databaseManager';

// Customer document interface
export interface CustomerDocument extends Document {
  name: string;
  phone: string;
  address?: string;
  previousBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

// Customer schema definition
const customerSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    previousBalance: {
      type: Number,
      default: 0,
      min: 0,
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
customerSchema.index({ phone: 1 }, { unique: true });
customerSchema.index({ name: 1 }); // For searching by name
customerSchema.index({ createdAt: -1 }); // For sorting by creation date

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

  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database connection not available. Please try again later.');
  }

  try {
    // First, try to find store by prefix (in case storeId is already a prefix)
    const storeByPrefix = await Store.findOne({ prefix: normalizedStoreId }).lean();
    if (storeByPrefix) {
      return storeByPrefix.prefix;
    }

    // Then try to find by storeId field
    const store = await Store.findOne({ storeId: normalizedStoreId }).lean();
    if (store) {
      return store.prefix;
    }

    // If not found, check if it's a valid prefix format and use it
    if (/^[a-z0-9_]+$/.test(normalizedStoreId)) {
      return normalizedStoreId;
    }

    throw new Error(`Store not found for storeId: ${storeId}. Please ensure your account is associated with a valid store.`);
  } catch (error: any) {
    if (error.message.includes('Store not found') || error.message.includes('Database connection')) {
      throw error;
    }
    throw new Error(`Failed to get store prefix: ${error.message}`);
  }
}

/**
 * Get a Mongoose model for a store-specific Customer collection
 * @param prefix - Store prefix (e.g., 'store1')
 * @param databaseId - Database ID where the collection is stored
 * @returns Mongoose model for the store-specific Customer collection
 */
export async function getCustomerModel(
  prefix: string | null,
  databaseId?: number
): Promise<Model<CustomerDocument>> {
  if (!prefix) {
    throw new Error('Store prefix is required for customer model');
  }

  // If databaseId is not provided, we need to get it from the Store model
  let finalDatabaseId: number | null | undefined = databaseId;
  if (!finalDatabaseId) {
    finalDatabaseId = await getDatabaseIdForStore(prefix, Store);
    if (!finalDatabaseId) {
      throw new Error(`Database ID not found for store with prefix: ${prefix}`);
    }
  }

  const dbId: number = finalDatabaseId;
  
  // Validate and sanitize prefix
  const sanitizedPrefix = prefix.toLowerCase().trim();
  if (!sanitizedPrefix || !/^[a-z0-9_]+$/.test(sanitizedPrefix)) {
    throw new Error(`Invalid store prefix: ${prefix}. Prefix can only contain lowercase letters, numbers, and underscores.`);
  }
  
  const collectionName = `${sanitizedPrefix}_customers`;
  
  // Validate collection name (MongoDB restrictions)
  if (collectionName.length > 255) {
    throw new Error(`Collection name too long: ${collectionName}. Maximum length is 255 characters.`);
  }
  
  // Get the connection for this database
  const connection = await getDatabaseConnection(dbId);
  
  // Check if model already exists in this connection
  if (connection.models[collectionName]) {
    return connection.models[collectionName] as Model<CustomerDocument>;
  }

  // Create new model with the collection name on the specific connection
  return connection.model<CustomerDocument>(collectionName, customerSchema, collectionName);
}

/**
 * Get Customer model for a user's store
 * @param storeId - User's storeId
 * @returns Mongoose model for the user's store Customer collection
 */
export async function getCustomerModelForStore(storeId: string | null | undefined): Promise<Model<CustomerDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access customers');
  }
  
  const prefix = await getStorePrefix(storeId);
  const databaseId = await getDatabaseIdForStore(storeId, Store);
  
  if (!databaseId) {
    throw new Error(`Database ID not found for store: ${storeId}`);
  }
  
  return getCustomerModel(prefix, databaseId);
}

