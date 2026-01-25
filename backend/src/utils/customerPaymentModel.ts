import mongoose, { Schema, Model, Document } from 'mongoose';
import { getAdminDatabaseConnection } from './databaseManager';
import { log } from './logger';

// Customer Payment document interface
export interface CustomerPaymentDocument extends Document {
  customerId: string;
  storeId: string; // Required: identifies which store the payment belongs to
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
      required: [true, 'Store ID is required'],
      index: true,
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
      // Allow negative amounts for debt operations (positive for balance, negative for debt)
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
 * Get a Mongoose model for the unified Customer Payment collection
 * All customer payments are stored in admin_db in a single collection, filtered by storeId
 * @returns Mongoose model for the Customer Payment collection in admin_db
 */
export function getCustomerPaymentModel(): Model<CustomerPaymentDocument> {
  const collectionName = 'customer_payments';
  
  // Get the admin_db connection (main database)
  const connection = getAdminDatabaseConnection();
  const connectionDbName = connection.db?.databaseName;
  
  if (connectionDbName !== 'admin_db') {
    log.warn(`Expected admin_db connection, but got: ${connectionDbName}`);
  }
  
  // Check if model already exists in this connection
  if (connection.models[collectionName]) {
    return connection.models[collectionName] as Model<CustomerPaymentDocument>;
  }

  // Create new model with the collection name on the admin_db connection
  return connection.model<CustomerPaymentDocument>(collectionName, customerPaymentSchema, collectionName);
}

/**
 * Get Customer Payment model for a user's store
 * Uses a single collection in admin_db, with storeId used for filtering
 * @param storeId - User's storeId (optional, but recommended for validation)
 * @returns Mongoose model for the Customer Payment collection in admin_db
 */
export function getCustomerPaymentModelForStore(storeId?: string | null): Model<CustomerPaymentDocument> {
  // Note: storeId is optional here since we use a unified collection
  // However, it's recommended to always provide it for consistency
  // All queries should filter by storeId when using this model
  return getCustomerPaymentModel();
}

