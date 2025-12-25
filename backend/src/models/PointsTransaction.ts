import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPointsTransaction extends Document {
  globalCustomerId: string; // Global customer identifier (phone or email)
  customerName: string; // Customer name for quick reference
  earningStoreId?: string; // Store where points were earned (for earned transactions)
  redeemingStoreId?: string; // Store where points were redeemed (for spent transactions)
  invoiceNumber?: string; // Invoice number if transaction is related to a sale
  transactionType: 'earned' | 'spent' | 'expired' | 'adjusted'; // Type of transaction
  points: number; // Points amount (positive for earned, negative for spent)
  purchaseAmount?: number; // Purchase amount that generated points (for earned transactions)
  pointsPercentage?: number; // Percentage used to calculate points (for earned transactions)
  pointsValue?: number; // Monetary value of points (for accounting)
  description?: string; // Description of the transaction
  expiresAt?: Date; // Expiration date for points (optional)
  createdAt: Date;
  updatedAt: Date;
}

const pointsTransactionSchema = new Schema<IPointsTransaction>(
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
    earningStoreId: {
      type: String,
      trim: true,
      lowercase: true,
    },
    redeemingStoreId: {
      type: String,
      trim: true,
      lowercase: true,
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    transactionType: {
      type: String,
      enum: ['earned', 'spent', 'expired', 'adjusted'],
      required: [true, 'Transaction type is required'],
    },
    points: {
      type: Number,
      required: [true, 'Points amount is required'],
    },
    purchaseAmount: {
      type: Number,
      min: 0,
    },
    pointsPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    pointsValue: {
      type: Number,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    expiresAt: {
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
pointsTransactionSchema.index({ globalCustomerId: 1, createdAt: -1 });
pointsTransactionSchema.index({ earningStoreId: 1, transactionType: 1, createdAt: -1 });
pointsTransactionSchema.index({ redeemingStoreId: 1, transactionType: 1, createdAt: -1 });
pointsTransactionSchema.index({ invoiceNumber: 1 });
pointsTransactionSchema.index({ transactionType: 1, createdAt: -1 });

export const PointsTransaction: Model<IPointsTransaction> = mongoose.model<IPointsTransaction>(
  'PointsTransaction',
  pointsTransactionSchema
);

export default PointsTransaction;

