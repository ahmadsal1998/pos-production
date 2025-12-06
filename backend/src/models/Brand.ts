import mongoose, { Schema, Document, Model } from 'mongoose';

export interface BrandDocument extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const brandSchema = new Schema<BrandDocument>(
  {
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

// Note: Unique constraint is handled per-store in brandModel.ts

const Brand: Model<BrandDocument> = mongoose.model<BrandDocument>('Brand', brandSchema);

export default Brand;

