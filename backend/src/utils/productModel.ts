import mongoose, { Schema, Model, Document, Connection } from 'mongoose';
import Store from '../models/Store';
import { getDatabaseConnection, getDatabaseIdForStore, getDatabaseName } from './databaseManager';

// Product document interface
export interface ProductDocument extends Document {
  name: string;
  barcode: string;
  costPrice: number;
  price: number;
  stock: number;
  warehouseId?: string;
  categoryId?: string;
  brandId?: string;
  mainUnitId?: string; // ID of the main unit selected from store units
  description?: string;
  lowStockAlert?: number;
  internalSKU?: string;
  vatPercentage?: number;
  vatInclusive?: boolean;
  productionDate?: Date;
  expiryDate?: Date;
  batchNumber?: string;
  discountRules?: {
    enabled: boolean;
    percentage: number;
    minQuantity?: number;
  };
  wholesalePrice?: number;
  units?: Array<{
    unitName: string;
    barcode: string;
    sellingPrice: number;
    conversionFactor: number;
  }>;
  multiWarehouseDistribution?: Array<{
    warehouseId: string;
    quantity: number;
  }>;
  status: 'active' | 'inactive' | 'hidden';
  images?: string[];
  showInQuickProducts?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Product schema definition
const productSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    barcode: {
      type: String,
      required: [true, 'Barcode is required'],
      trim: true,
      unique: true,
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    warehouseId: {
      type: String,
      trim: true,
    },
    categoryId: {
      type: String,
      trim: true,
    },
    brandId: {
      type: String,
      trim: true,
    },
    mainUnitId: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    lowStockAlert: {
      type: Number,
      default: 10,
      min: [0, 'Low stock alert cannot be negative'],
    },
    internalSKU: {
      type: String,
      trim: true,
    },
    vatPercentage: {
      type: Number,
      default: 0,
      min: [0, 'VAT percentage cannot be negative'],
      max: [100, 'VAT percentage cannot exceed 100'],
    },
    vatInclusive: {
      type: Boolean,
      default: false,
    },
    productionDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    discountRules: {
      enabled: {
        type: Boolean,
        default: false,
      },
      percentage: {
        type: Number,
        default: 0,
        min: [0, 'Discount percentage cannot be negative'],
        max: [100, 'Discount percentage cannot exceed 100'],
      },
      minQuantity: {
        type: Number,
        min: [1, 'Minimum quantity must be at least 1'],
      },
    },
    wholesalePrice: {
      type: Number,
      min: [0, 'Wholesale price cannot be negative'],
    },
    units: [
      {
        unitName: {
          type: String,
          required: true,
          trim: true,
        },
        barcode: {
          type: String,
          trim: true,
        },
        sellingPrice: {
          type: Number,
          required: true,
          min: [0, 'Selling price cannot be negative'],
        },
        conversionFactor: {
          type: Number,
          default: 1,
          min: [1, 'Conversion factor must be at least 1'],
        },
      },
    ],
    multiWarehouseDistribution: [
      {
        warehouseId: {
          type: String,
          required: true,
          trim: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [0, 'Quantity cannot be negative'],
        },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive', 'hidden'],
      default: 'active',
    },
    images: [String],
    showInQuickProducts: {
      type: Boolean,
      default: false,
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
productSchema.index({ barcode: 1 }, { unique: true });
productSchema.index({ name: 1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ brandId: 1 });
productSchema.index({ warehouseId: 1 });
productSchema.index({ status: 1 });
productSchema.index({ showInQuickProducts: 1 });
productSchema.index({ createdAt: -1 });

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
 * Get a Mongoose model for a store-specific Product collection
 * @param prefix - Store prefix (e.g., 'store1')
 * @param databaseId - Database ID where the collection is stored
 * @returns Mongoose model for the store-specific Product collection
 */
export async function getProductModel(
  prefix: string | null,
  databaseId?: number
): Promise<Model<ProductDocument>> {
  if (!prefix) {
    const defaultCollectionName = 'products';
    if (mongoose.models[defaultCollectionName]) {
      return mongoose.models[defaultCollectionName] as Model<ProductDocument>;
    }
    return mongoose.model<ProductDocument>(defaultCollectionName, productSchema, defaultCollectionName);
  }

  let finalDatabaseId: number | null | undefined = databaseId;
  if (!finalDatabaseId) {
    finalDatabaseId = await getDatabaseIdForStore(prefix, Store);
    if (!finalDatabaseId) {
      throw new Error(`Database ID not found for store with prefix: ${prefix}`);
    }
  }

  const dbId: number = finalDatabaseId;
  const sanitizedPrefix = prefix.toLowerCase().trim();
  if (!sanitizedPrefix || !/^[a-z0-9_]+$/.test(sanitizedPrefix)) {
    throw new Error(`Invalid store prefix: ${prefix}. Prefix can only contain lowercase letters, numbers, and underscores.`);
  }

  const collectionName = `${sanitizedPrefix}_products`;

  if (collectionName.length > 255) {
    throw new Error(`Collection name too long: ${collectionName}. Maximum length is 255 characters.`);
  }

  const connection = await getDatabaseConnection(dbId);
  const connectionDbName = connection.db?.databaseName;
  if (connectionDbName && connectionDbName !== getDatabaseName(dbId)) {
    console.warn(`⚠️ Database name mismatch: Expected ${getDatabaseName(dbId)}, got ${connectionDbName}`);
  }

  if (connection.models[collectionName]) {
    return connection.models[collectionName] as Model<ProductDocument>;
  }

  return connection.model<ProductDocument>(collectionName, productSchema, collectionName);
}

/**
 * Get Product model for a user's store
 * @param storeId - User's storeId
 * @returns Mongoose model for the user's store Product collection
 */
export async function getProductModelForStore(
  storeId: string | null | undefined
): Promise<Model<ProductDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access products');
  }

  const prefix = await getStorePrefix(storeId);
  const databaseId = await getDatabaseIdForStore(storeId, Store);

  if (!databaseId) {
    throw new Error(`Database ID not found for store: ${storeId}`);
  }

  return getProductModel(prefix, databaseId);
}

