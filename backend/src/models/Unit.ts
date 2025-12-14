import mongoose, { Schema, Document, Model } from 'mongoose';

export interface UnitDocument extends Document {
  storeId: string; // REQUIRED: Store ID for multi-tenant isolation
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const unitSchema = new Schema<UnitDocument>(
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
      required: [true, 'Unit name is required'],
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
// Unique unit name per store
unitSchema.index({ storeId: 1, name: 1 }, { unique: true });
// List units
unitSchema.index({ storeId: 1, createdAt: -1 });

const Unit: Model<UnitDocument> = mongoose.model<UnitDocument>('Unit', unitSchema);

export default Unit;

