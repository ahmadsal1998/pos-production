import mongoose, { Schema, Model, Document } from 'mongoose';
import Store from '../models/Store';
import { ISale, ISaleItem } from '../models/Sale';

// Sale document interface (extends ISale with proper _id type)
// Note: ISale extends Document which has _id as unknown, so we override it
export interface SaleDocument extends Omit<ISale, '_id'> {
  _id: mongoose.Types.ObjectId;
}

// Sale item schema
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
      // Allow negative for return invoices (negative prices represent refunds)
    },
    totalPrice: {
      type: Number,
      required: true,
      // Allow negative for return invoices
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

// Sale schema definition
const saleSchema = new Schema<SaleDocument>(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      index: true,
    },
    storeId: {
      type: String,
      index: true,
      default: null,
    },
    date: {
      type: Date,
      required: [true, 'Sale date is required'],
      default: Date.now,
      index: true,
    },
    customerId: {
      type: String,
      index: true,
      default: null,
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
      // Allow negative for return invoices
    },
    totalItemDiscount: {
      type: Number,
      default: 0,
      // Allow negative for return invoices
    },
    invoiceDiscount: {
      type: Number,
      default: 0,
      // Allow negative for return invoices
    },
    tax: {
      type: Number,
      default: 0,
      // Allow negative for return invoices
    },
    total: {
      type: Number,
      required: true,
      // Allow negative for return invoices
    },
    paidAmount: {
      type: Number,
      required: true,
      // Allow negative for return invoices (refunds)
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
      index: true,
    },
    status: {
      type: String,
      enum: ['completed', 'partial_payment', 'pending', 'refunded', 'partial_refund'],
      default: 'completed',
      index: true,
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

// Indexes for better query performance
saleSchema.index({ invoiceNumber: 1, storeId: 1 }, { unique: true }); // Unique invoice number per store
saleSchema.index({ date: -1, storeId: 1 });
saleSchema.index({ customerId: 1, storeId: 1 });
saleSchema.index({ status: 1, storeId: 1 });
saleSchema.index({ paymentMethod: 1, storeId: 1 });

/**
 * Sale Model Utilities
 * 
 * Provides functions to get Sale models with the correct collection name
 * based on whether a store is a trial account.
 */

import { Sale } from '../models/Sale';
import { getModelForStore } from './trialAccountModels';

/**
 * Get Sale model with correct collection name based on trial status
 * Trial accounts use 'sales_test' collection, regular accounts use 'sales'
 * 
 * @param storeId - The store ID to check
 * @returns Promise<Model<SaleDocument>> - The Sale model with correct collection
 */
export async function getSaleModelForStore(storeId: string | null | undefined): Promise<Model<SaleDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access sales');
  }
  
  // Get model with correct collection name based on trial status
  // Cast to Model<SaleDocument> since SaleDocument is compatible with ISale (just overrides _id type)
  const model = await getModelForStore(Sale, 'sales', storeId);
  return model as unknown as Model<SaleDocument>;
}
