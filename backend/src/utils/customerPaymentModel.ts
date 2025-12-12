import mongoose, { Schema, Model, Document, Connection } from 'mongoose';
import Store from '../models/Store';
import { getDatabaseConnection, getDatabaseIdForStore, getDatabaseName } from './databaseManager';
import { getStorePrefix } from './customerModel';

// Customer Payment document interface
export interface CustomerPaymentDocument extends Document {
  customerId: string;
  storeId?: string;
  date: Date;
  amount: number;
  method: 'Cash' | 'Bank Transfer' | 'Cheque';
  invoiceId?: string; // Optional link to a specific invoice
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Customer Payment schema definition
const customerPaymentSchema = new Schema<CustomerPaymentDocument>(
  {
    customerId: {
      type: String,
      required: [true, 'Customer ID is required'],
      index: true,
    },
    storeId: {
      type: String,
      index: true,
      default: null,
    },
    date: {
      type: Date,
      required: [true, 'Payment date is required'],
      default: Date.now,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount must be positive'],
    },
    method: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'Cheque'],
      required: [true, 'Payment method is required'],
      index: true,
    },
    invoiceId: {
      type: String,
      index: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for better query performance
customerPaymentSchema.index({ customerId: 1, storeId: 1 });
customerPaymentSchema.index({ date: -1, storeId: 1 });
customerPaymentSchema.index({ method: 1, storeId: 1 });
customerPaymentSchema.index({ invoiceId: 1, storeId: 1 });

/**
 * Get a Mongoose model for a store-specific Customer Payment collection
 * @param prefix - Store prefix (e.g., 'store1')
 * @param databaseId - Database ID where the collection is stored
 * @returns Mongoose model for the store-specific Customer Payment collection
 */
export async function getCustomerPaymentModel(
  prefix: string | null,
  databaseId?: number
): Promise<Model<CustomerPaymentDocument>> {
  if (!prefix) {
    throw new Error('Store prefix is required for customer payment model');
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
  
  const collectionName = `${sanitizedPrefix}_customer_payments`;
  
  // Validate collection name (MongoDB restrictions)
  if (collectionName.length > 255) {
    throw new Error(`Collection name too long: ${collectionName}. Maximum length is 255 characters.`);
  }
  
  // Get the connection for this database
  const connection = await getDatabaseConnection(dbId);
  const connectionDbName = connection.db?.databaseName;
  if (connectionDbName && connectionDbName !== getDatabaseName(dbId)) {
    console.warn(`⚠️ Database name mismatch: Expected ${getDatabaseName(dbId)}, got ${connectionDbName}`);
  }
  
  // Check if model already exists in this connection
  if (connection.models[collectionName]) {
    return connection.models[collectionName] as Model<CustomerPaymentDocument>;
  }

  // Create new model with the collection name on the specific connection
  return connection.model<CustomerPaymentDocument>(collectionName, customerPaymentSchema, collectionName);
}

/**
 * Get Customer Payment model for a user's store
 * @param storeId - User's storeId
 * @returns Mongoose model for the user's store Customer Payment collection
 */
export async function getCustomerPaymentModelForStore(storeId: string | null | undefined): Promise<Model<CustomerPaymentDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access customer payments');
  }
  
  const prefix = await getStorePrefix(storeId);
  const databaseId = await getDatabaseIdForStore(storeId, Store);
  
  if (!databaseId) {
    throw new Error(`Database ID not found for store: ${storeId}`);
  }
  
  return getCustomerPaymentModel(prefix, databaseId);
}

