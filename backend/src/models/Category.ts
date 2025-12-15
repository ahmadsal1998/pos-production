import mongoose, { Schema, Document, Model } from 'mongoose';

export interface CategoryDocument extends Document {
  storeId: string; // REQUIRED: Store ID for multi-tenant isolation
  name: string;
  description?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    storeId: {
      type: String,
      required: [true, 'Store ID is required'],
      trim: true,
      lowercase: true,
      // Index is created via compound indexes below
    },
    description: {
      type: String,
      trim: true,
    },
    imageUrl: {
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
// Unique category name per store
categorySchema.index({ storeId: 1, name: 1 }, { unique: true });
// List categories
categorySchema.index({ storeId: 1, createdAt: -1 });

const Category: Model<CategoryDocument> = mongoose.model<CategoryDocument>('Category', categorySchema);

export default Category;

