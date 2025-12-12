import mongoose, { Schema, Document, Model } from 'mongoose';

// OTP Document interface
export interface OTPDocument extends Document {
  email: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

// OTP Schema
const otpSchema = new Schema<OTPDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, 'OTP code is required'],
      length: 6,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index to auto-delete expired documents
    },
  },
  {
    timestamps: true,
    autoCreate: false, // Prevent automatic collection creation - only create when data is inserted
  }
);

// Index to ensure one active OTP per email
otpSchema.index({ email: 1, expiresAt: 1 });

// Create model
const OTP: Model<OTPDocument> = mongoose.model<OTPDocument>('OTP', otpSchema);

export default OTP;

