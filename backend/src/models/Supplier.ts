import mongoose, { Schema, Document, Model } from 'mongoose';

export interface SupplierDocument extends Document {
  storeId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  previousBalance: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<SupplierDocument>(
  {
    storeId: {
      type: String,
      required: [true, 'Store ID is required'],
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    previousBalance: {
      type: Number,
      default: 0,
    },
    notes: {
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

supplierSchema.index({ storeId: 1, name: 1 });
supplierSchema.index({ storeId: 1, phone: 1 });
supplierSchema.index({ storeId: 1, createdAt: -1 });

const Supplier: Model<SupplierDocument> = mongoose.model<SupplierDocument>('Supplier', supplierSchema);

export default Supplier;
