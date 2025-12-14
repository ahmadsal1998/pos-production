import mongoose, { Schema, Document, Model } from 'mongoose';

export interface CustomerDocument extends Document {
  storeId: string; // REQUIRED: Store ID for multi-tenant isolation
  name: string;
  phone: string;
  address?: string;
  previousBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<CustomerDocument>(
  {
    storeId: {
      type: String,
      required: [true, 'Store ID is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
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

// CRITICAL INDEXES for performance
// Unique phone per store
customerSchema.index({ storeId: 1, phone: 1 }, { unique: true });
// Search by name
customerSchema.index({ storeId: 1, name: 1 });
// List customers
customerSchema.index({ storeId: 1, createdAt: -1 });

const Customer: Model<CustomerDocument> = mongoose.model<CustomerDocument>('Customer', customerSchema);

export default Customer;

