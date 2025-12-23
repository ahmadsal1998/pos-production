import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * StorePointsAccount model for tracking points accounting per store
 * Tracks: points issued, points redeemed, net balance, and financial amounts
 */
export interface IStorePointsAccount extends Document {
  storeId: string; // Store ID (unique)
  storeName: string; // Store name for quick reference
  
  // Points tracking
  totalPointsIssued: number; // Total points issued by this store
  totalPointsRedeemed: number; // Total points redeemed at this store
  netPointsBalance: number; // Net balance (issued - redeemed, can be negative)
  
  // Financial tracking
  pointsValuePerPoint: number; // Monetary value of 1 point (e.g., 0.01 for 1 point = $0.01)
  totalPointsValueIssued: number; // Total monetary value of points issued
  totalPointsValueRedeemed: number; // Total monetary value of points redeemed
  netFinancialBalance: number; // Net financial balance (value of issued - value of redeemed)
  
  // Accounting summary
  // If netPointsBalance > 0: Store owes value of unused points
  // If netPointsBalance < 0: Store owes value of extra points redeemed
  amountOwed: number; // Amount store owes (always positive, calculated from netFinancialBalance)
  
  lastUpdated: Date; // Last time account was updated
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  recalculate(): void;
}

const storePointsAccountSchema = new Schema<IStorePointsAccount>(
  {
    storeId: {
      type: String,
      required: [true, 'Store ID is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    storeName: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
    },
    totalPointsIssued: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPointsRedeemed: {
      type: Number,
      default: 0,
      min: 0,
    },
    netPointsBalance: {
      type: Number,
      default: 0,
    },
    pointsValuePerPoint: {
      type: Number,
      default: 0.01, // Default: 1 point = $0.01
      min: 0,
    },
    totalPointsValueIssued: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPointsValueRedeemed: {
      type: Number,
      default: 0,
      min: 0,
    },
    netFinancialBalance: {
      type: Number,
      default: 0,
    },
    amountOwed: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
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
storePointsAccountSchema.index({ storeId: 1 }, { unique: true });
storePointsAccountSchema.index({ netPointsBalance: -1 });
storePointsAccountSchema.index({ amountOwed: -1 });
storePointsAccountSchema.index({ lastUpdated: -1 });

/**
 * Recalculate account balances based on current values
 */
storePointsAccountSchema.methods.recalculate = function() {
  this.netPointsBalance = this.totalPointsIssued - this.totalPointsRedeemed;
  this.totalPointsValueIssued = this.totalPointsIssued * this.pointsValuePerPoint;
  this.totalPointsValueRedeemed = this.totalPointsRedeemed * this.pointsValuePerPoint;
  this.netFinancialBalance = this.totalPointsValueIssued - this.totalPointsValueRedeemed;
  
  // Amount owed is always positive
  // If netFinancialBalance > 0: Store owes value of unused points
  // If netFinancialBalance < 0: Store owes value of extra points redeemed
  this.amountOwed = Math.abs(this.netFinancialBalance);
  this.lastUpdated = new Date();
};

export const StorePointsAccount: Model<IStorePointsAccount> = mongoose.model<IStorePointsAccount>(
  'StorePointsAccount',
  storePointsAccountSchema
);

export default StorePointsAccount;

