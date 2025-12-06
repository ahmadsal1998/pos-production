import mongoose, { Schema, Document, Model } from 'mongoose';

export interface CategoryDocument extends Document {
  name: string;
  description?: string;
  imageUrl?: string;
  storeId: string | null; // null for system categories, string for store-specific categories
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
      required: false,
      trim: true,
      lowercase: true,
      default: null,
      // null means system category, string means store-specific category
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

// Indexes
categorySchema.index({ storeId: 1 });
// Compound index for store-specific category name uniqueness
categorySchema.index({ storeId: 1, name: 1 }, { unique: true, partialFilterExpression: { storeId: { $ne: null } } });
// Index for system categories (storeId is null)
categorySchema.index({ name: 1 }, { unique: true, partialFilterExpression: { storeId: null } });

const Category: Model<CategoryDocument> = mongoose.model<CategoryDocument>('Category', categorySchema);

export default Category;

