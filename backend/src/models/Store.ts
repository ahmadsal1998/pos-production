import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStore {
  _id: mongoose.Types.ObjectId;
  storeId: string;
  name: string;
  prefix: string;
  databaseId: number; // Database ID (1-5) where this store's data is stored
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreDocument extends Document, Omit<IStore, '_id'> {
  _id: mongoose.Types.ObjectId;
}

const storeSchema = new Schema<StoreDocument>(
  {
    storeId: {
      type: String,
      required: [true, 'Store ID is required'],
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
    },
    prefix: {
      type: String,
      required: [true, 'Store prefix is required'],
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9_]+$/, 'Prefix must contain only lowercase letters, numbers, and underscores'],
    },
    databaseId: {
      type: Number,
      required: [true, 'Database ID is required'],
      min: 1,
      max: 5, // Based on DATABASE_CONFIG.DATABASE_COUNT
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

// Indexes
storeSchema.index({ storeId: 1 });
storeSchema.index({ prefix: 1 });
storeSchema.index({ databaseId: 1 });

// Create model
const Store: Model<StoreDocument> = mongoose.model<StoreDocument>('Store', storeSchema);

export default Store;

