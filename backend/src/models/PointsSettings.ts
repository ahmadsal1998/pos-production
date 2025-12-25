import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPointsSettings extends Document {
  // Global settings (storeId = 'global' or null)
  storeId?: string; // null or 'global' for global settings, or specific storeId for store-specific settings
  userPointsPercentage: number; // Percentage of purchase value that becomes user points (e.g., 5 for 5%)
  companyProfitPercentage: number; // Percentage of purchase value that becomes company profit (e.g., 2 for 2%)
  defaultThreshold: number; // Default threshold for store accounts (e.g., 10000)
  pointsExpirationDays?: number; // Number of days before points expire (optional, null = no expiration)
  minPurchaseAmount?: number; // Minimum purchase amount to earn points (optional)
  maxPointsPerTransaction?: number; // Maximum points that can be earned per transaction (optional)
  pointsValuePerPoint?: number; // Monetary value of 1 point (e.g., 0.01 for 1 point = $0.01)
  createdAt: Date;
  updatedAt: Date;
}

const pointsSettingsSchema = new Schema<IPointsSettings>(
  {
    storeId: {
      type: String,
      default: 'global', // Global settings by default
      trim: true,
      lowercase: true,
    },
    userPointsPercentage: {
      type: Number,
      required: [true, 'User points percentage is required'],
      default: 5, // Default 5%
      min: 0,
      max: 100,
    },
    companyProfitPercentage: {
      type: Number,
      required: [true, 'Company profit percentage is required'],
      default: 2, // Default 2%
      min: 0,
      max: 100,
    },
    defaultThreshold: {
      type: Number,
      required: [true, 'Default threshold is required'],
      default: 10000, // Default threshold of 10,000
      min: 0,
    },
    pointsExpirationDays: {
      type: Number,
      min: 1,
    },
    minPurchaseAmount: {
      type: Number,
      min: 0,
    },
    maxPointsPerTransaction: {
      type: Number,
      min: 0,
    },
    pointsValuePerPoint: {
      type: Number,
      default: 0.01, // Default: 1 point = $0.01
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
// Unique settings per store (or global)
pointsSettingsSchema.index({ storeId: 1 }, { unique: true });

export const PointsSettings: Model<IPointsSettings> = mongoose.model<IPointsSettings>(
  'PointsSettings',
  pointsSettingsSchema
);

export default PointsSettings;

