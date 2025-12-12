import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  invoiceId: string;
  storeId?: string;
  merchantId?: mongoose.Types.ObjectId; // Reference to Merchant
  terminalId?: mongoose.Types.ObjectId; // Reference to Terminal
  amount: number;
  currency: string;
  paymentMethod: 'Cash' | 'Card' | 'Credit';
  status: 'Pending' | 'Approved' | 'Declined' | 'Error' | 'Cancelled';
  transactionId?: string;
  authorizationCode?: string;
  terminalResponse?: any;
  errorMessage?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    invoiceId: {
      type: String,
      required: [true, 'Invoice ID is required'],
      index: true,
    },
    storeId: {
      type: String,
      index: true,
      default: null,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      default: null,
      index: false, // Explicitly disable automatic index - we use compound indexes instead
    },
    terminalId: {
      type: Schema.Types.ObjectId,
      ref: 'Terminal',
      index: true,
      default: null,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount must be positive'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'SAR',
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Credit'],
      required: [true, 'Payment method is required'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Declined', 'Error', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    transactionId: {
      type: String,
    },
    authorizationCode: {
      type: String,
    },
    terminalResponse: {
      type: Schema.Types.Mixed,
    },
    errorMessage: {
      type: String,
    },
    processedAt: {
      type: Date,
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

// Indexes for better query performance
paymentSchema.index({ invoiceId: 1, storeId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ transactionId: 1 });
// Compound indexes for merchantId queries
// MongoDB can use these for queries on merchantId alone (prefix matching)
paymentSchema.index({ merchantId: 1, terminalId: 1 });
paymentSchema.index({ merchantId: 1, status: 1 });

export const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', paymentSchema);

