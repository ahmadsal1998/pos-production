import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit?: string;
  discount?: number;
  conversionFactor?: number;
}

export interface ISale extends Document {
  invoiceNumber: string;
  storeId?: string;
  date: Date;
  customerId?: string;
  customerName: string;
  items: ISaleItem[];
  subtotal: number;
  totalItemDiscount: number;
  invoiceDiscount: number;
  tax: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: 'cash' | 'card' | 'credit';
  status: 'completed' | 'partial_payment' | 'pending' | 'refunded' | 'partial_refund';
  seller: string;
  // Return-related fields
  originalInvoiceId?: string; // For return transactions, link to original invoice
  isReturn?: boolean; // Flag to identify return transactions
  createdAt: Date;
  updatedAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>(
  {
    productId: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      default: 'قطعة',
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    conversionFactor: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

const saleSchema = new Schema<ISale>(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      // Index is created via compound index below
    },
    storeId: {
      type: String,
      required: [true, 'Store ID is required'],
      trim: true,
      lowercase: true,
      // Index is created via compound indexes below
    },
    date: {
      type: Date,
      required: [true, 'Sale date is required'],
      default: Date.now,
      // Index is created via compound index below
    },
    customerId: {
      type: String,
      default: null,
      // Index is created via compound index below
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
    },
    items: {
      type: [saleItemSchema],
      required: [true, 'Sale items are required'],
      validate: {
        validator: (items: ISaleItem[]) => items.length > 0,
        message: 'Sale must have at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    totalItemDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    invoiceDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'credit'],
      required: [true, 'Payment method is required'],
      lowercase: true,
      // Index is created via compound index below
    },
    status: {
      type: String,
      enum: ['completed', 'partial_payment', 'pending', 'refunded', 'partial_refund'],
      default: 'completed',
      // Index is created via compound index below
    },
    seller: {
      type: String,
      required: [true, 'Seller is required'],
    },
    // Return-related fields
    originalInvoiceId: {
      type: String,
      index: true,
      default: null,
    },
    isReturn: {
      type: Boolean,
      default: false,
      index: true,
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
// Unique invoice number per store
saleSchema.index({ storeId: 1, invoiceNumber: 1 }, { unique: true });
// Common query patterns
saleSchema.index({ storeId: 1, date: -1 });
saleSchema.index({ storeId: 1, customerId: 1 });
saleSchema.index({ storeId: 1, status: 1 });
saleSchema.index({ storeId: 1, paymentMethod: 1 });
saleSchema.index({ storeId: 1, createdAt: -1 });

export const Sale: Model<ISale> = mongoose.model<ISale>('Sale', saleSchema);
