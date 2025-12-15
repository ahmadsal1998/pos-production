"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSaleModelForStore = getSaleModelForStore;
const mongoose_1 = require("mongoose");
// Sale item schema
const saleItemSchema = new mongoose_1.Schema({
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
}, { _id: false });
// Sale schema definition
const saleSchema = new mongoose_1.Schema({
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
            validator: (items) => items.length > 0,
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
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
// Indexes for better query performance
saleSchema.index({ invoiceNumber: 1, storeId: 1 }, { unique: true }); // Unique invoice number per store
saleSchema.index({ date: -1, storeId: 1 });
saleSchema.index({ customerId: 1, storeId: 1 });
saleSchema.index({ status: 1, storeId: 1 });
saleSchema.index({ paymentMethod: 1, storeId: 1 });
/**
 * @deprecated This file is deprecated. Use the unified Sale model directly from ../models/Sale
 *
 * All sales are now stored in a single unified 'sales' collection with storeId field.
 * Use Sale model directly and filter by storeId in queries.
 */
const Sale_1 = require("../models/Sale");
/**
 * @deprecated Use Sale model directly from ../models/Sale
 * Get Sale model - returns the unified Sale model
 * All sales are stored in a single collection with storeId field
 */
async function getSaleModelForStore(storeId) {
    if (!storeId) {
        throw new Error('Store ID is required to access sales');
    }
    // Return the unified Sale model
    // Always filter queries by storeId when using this model
    return Sale_1.Sale;
}
