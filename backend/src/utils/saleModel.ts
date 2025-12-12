import mongoose, { Schema, Model, Document, Connection } from 'mongoose';
import Store from '../models/Store';
import { getDatabaseConnection, getDatabaseIdForStore, getDatabaseName } from './databaseManager';
import { ISale, ISaleItem } from '../models/Sale';

// Sale document interface (extends ISale)
export interface SaleDocument extends Document, Omit<ISale, '_id'> {
  _id: mongoose.Types.ObjectId;
}

// Sale item schema
const saleItemSchema = new Schema<ISaleItem>(
  {
    productId: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      // Allow negative for return invoices (negative prices represent refunds)
    },
    totalPrice: {
      type: Number,
      required: true,
      // Allow negative for return invoices
    },
    unit: {
      type: String,
      default: 'قطعة',
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    conversionFactor: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

// Sale schema definition
const saleSchema = new Schema<SaleDocument>(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      index: true,
    },
    storeId: {
      type: String,
      index: true,
      default: null,
    },
    date: {
      type: Date,
      required: [true, 'Sale date is required'],
      default: Date.now,
      index: true,
    },
    customerId: {
      type: String,
      index: true,
      default: null,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
    },
    items: {
      type: [saleItemSchema],
      required: [true, 'Sale items are required'],
      validate: {
        validator: (items: ISaleItem[]) => items.length > 0,
        message: 'Sale must have at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      // Allow negative for return invoices
    },
    totalItemDiscount: {
      type: Number,
      default: 0,
      // Allow negative for return invoices
    },
    invoiceDiscount: {
      type: Number,
      default: 0,
      // Allow negative for return invoices
    },
    tax: {
      type: Number,
      default: 0,
      // Allow negative for return invoices
    },
    total: {
      type: Number,
      required: true,
      // Allow negative for return invoices
    },
    paidAmount: {
      type: Number,
      required: true,
      // Allow negative for return invoices (refunds)
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'credit'],
      required: [true, 'Payment method is required'],
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['completed', 'partial_payment', 'pending', 'refunded', 'partial_refund'],
      default: 'completed',
      index: true,
    },
    seller: {
      type: String,
      required: [true, 'Seller is required'],
    },
    // Return-related fields
    originalInvoiceId: {
      type: String,
      index: true,
      default: null,
    },
    isReturn: {
      type: Boolean,
      default: false,
      index: true,
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
saleSchema.index({ invoiceNumber: 1, storeId: 1 }, { unique: true }); // Unique invoice number per store
saleSchema.index({ date: -1, storeId: 1 });
saleSchema.index({ customerId: 1, storeId: 1 });
saleSchema.index({ status: 1, storeId: 1 });
saleSchema.index({ paymentMethod: 1, storeId: 1 });

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
 * Get a Mongoose model for a store-specific Sale collection
 * @param prefix - Store prefix (e.g., 'abo_loof')
 * @param databaseId - Database ID where the collection is stored
 * @returns Mongoose model for the store-specific Sale collection
 */
export async function getSaleModel(
  prefix: string | null,
  databaseId?: number
): Promise<Model<SaleDocument>> {
  if (!prefix) {
    throw new Error('Store prefix is required for sale model');
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
  
  const collectionName = `${sanitizedPrefix}_sales`;
  
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
    return connection.models[collectionName] as Model<SaleDocument>;
  }

  // Create new model with the collection name on the specific connection
  return connection.model<SaleDocument>(collectionName, saleSchema, collectionName);
}

/**
 * Get Sale model for a user's store
 * @param storeId - User's storeId
 * @returns Mongoose model for the user's store Sale collection
 */
export async function getSaleModelForStore(storeId: string | null | undefined): Promise<Model<SaleDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access sales');
  }
  
  const prefix = await getStorePrefix(storeId);
  const databaseId = await getDatabaseIdForStore(storeId, Store);
  
  if (!databaseId) {
    throw new Error(`Database ID not found for store: ${storeId}`);
  }
  
  return getSaleModel(prefix, databaseId);
}
