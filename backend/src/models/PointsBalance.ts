import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPointsBalance extends Document {
  globalCustomerId: string; // Global customer identifier (phone or email)
  customerName: string; // Customer name for quick reference
  customerPhone?: string; // Customer phone for quick reference
  customerEmail?: string; // Customer email for quick reference
  totalPoints: number; // Total points balance (global across all stores)
  availablePoints: number; // Available points (not expired)
  pendingPoints: number; // Points pending expiration
  lifetimeEarned: number; // Lifetime points earned (across all stores)
  lifetimeSpent: number; // Lifetime points spent (across all stores)
  lastTransactionDate?: Date; // Date of last transaction
  createdAt: Date;
  updatedAt: Date;
}

const pointsBalanceSchema = new Schema<IPointsBalance>(
  {
    globalCustomerId: {
      type: String,
      required: [true, 'Global customer ID is required'],
      trim: true,
      lowercase: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    totalPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    availablePoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimeEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastTransactionDate: {
      type: Date,
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
// Unique global customer
pointsBalanceSchema.index({ globalCustomerId: 1 }, { unique: true });
// Search by phone or email
pointsBalanceSchema.index({ customerPhone: 1 });
pointsBalanceSchema.index({ customerEmail: 1 });
// List balances
pointsBalanceSchema.index({ totalPoints: -1 });
pointsBalanceSchema.index({ createdAt: -1 });

export const PointsBalance: Model<IPointsBalance> = mongoose.model<IPointsBalance>(
  'PointsBalance',
  pointsBalanceSchema
);

export default PointsBalance;

