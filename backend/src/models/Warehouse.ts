import mongoose, { Schema, Document, Model } from 'mongoose';

export interface WarehouseDocument extends Document {
  storeId: string; // REQUIRED: Store ID for multi-tenant isolation
  name: string;
  description?: string;
  address?: string;
  status: 'Active' | 'Inactive';
  createdAt: Date;
  updatedAt: Date;
}

const warehouseSchema = new Schema<WarehouseDocument>(
  {
    storeId: {
      type: String,
      required: [true, 'Store ID is required'],
      trim: true,
      lowercase: true,
      // Index is created via compound indexes below
    },
    name: {
      type: String,
      required: [true, 'Warehouse name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// CRITICAL INDEXES for performance
// Unique warehouse name per store
warehouseSchema.index({ storeId: 1, name: 1 }, { unique: true });
// List warehouses by store
warehouseSchema.index({ storeId: 1, status: 1 });
warehouseSchema.index({ storeId: 1, createdAt: -1 });

const Warehouse: Model<WarehouseDocument> = mongoose.model<WarehouseDocument>('Warehouse', warehouseSchema);

export default Warehouse;

