import mongoose, { Schema, Document, Model } from 'mongoose';

export interface BrandDocument extends Document {
  storeId: string; // REQUIRED: Store ID for multi-tenant isolation
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const brandSchema = new Schema<BrandDocument>(
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
      required: [true, 'Brand name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
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
// Unique brand name per store
brandSchema.index({ storeId: 1, name: 1 }, { unique: true });
// List brands
brandSchema.index({ storeId: 1, createdAt: -1 });

const Brand: Model<BrandDocument> = mongoose.model<BrandDocument>('Brand', brandSchema);

export default Brand;

