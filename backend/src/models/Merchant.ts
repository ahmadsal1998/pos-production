import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMerchant extends Document {
  name: string;
  merchantId: string; // MID - Merchant ID from payment processor
  storeId?: string; // Optional: Link to store if merchant is store-specific
  status: 'Active' | 'Inactive';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const merchantSchema = new Schema<IMerchant>(
  {
    name: {
      type: String,
      required: [true, 'Merchant name is required'],
      trim: true,
    },
    merchantId: {
      type: String,
      required: [true, 'Merchant ID (MID) is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    storeId: {
      type: String,
      index: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    autoCreate: false, // Prevent automatic collection creation - only create when data is inserted
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
merchantSchema.index({ merchantId: 1 });
merchantSchema.index({ storeId: 1, status: 1 });

export const Merchant: Model<IMerchant> = mongoose.model<IMerchant>('Merchant', merchantSchema);

