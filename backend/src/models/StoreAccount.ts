import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStoreAccount extends Document {
  storeId: string; // Store ID
  storeName: string; // Store name for quick reference
  totalEarned: number; // Total amount earned from points (company profit)
  totalPaid: number; // Total amount paid to store
  dueBalance: number; // Current amount due to store (totalEarned - totalPaid)
  threshold: number; // Threshold amount (when reached, account is paused)
  isPaused: boolean; // Whether account is paused due to threshold
  pausedAt?: Date; // Date when account was paused
  pausedReason?: string; // Reason for pausing
  lastPaymentDate?: Date; // Date of last payment
  lastPaymentAmount?: number; // Amount of last payment
  createdAt: Date;
  updatedAt: Date;
}

const storeAccountSchema = new Schema<IStoreAccount>(
  {
    storeId: {
      type: String,
      required: [true, 'Store ID is required'],
      trim: true,
      lowercase: true,
    },
    storeName: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
    },
    totalEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    threshold: {
      type: Number,
      required: [true, 'Threshold is required'],
      default: 10000, // Default threshold of 10,000
      min: 0,
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
    pausedAt: {
      type: Date,
    },
    pausedReason: {
      type: String,
      trim: true,
    },
    lastPaymentDate: {
      type: Date,
    },
    lastPaymentAmount: {
      type: Number,
      min: 0,
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

// CRITICAL INDEXES for performance
storeAccountSchema.index({ storeId: 1 }, { unique: true });
storeAccountSchema.index({ isPaused: 1, dueBalance: -1 });
storeAccountSchema.index({ dueBalance: -1 });

export const StoreAccount: Model<IStoreAccount> = mongoose.model<IStoreAccount>(
  'StoreAccount',
  storeAccountSchema
);

export default StoreAccount;

