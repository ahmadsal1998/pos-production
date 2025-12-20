"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sale = void 0;
const mongoose_1 = __importStar(require("mongoose"));
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
const saleSchema = new mongoose_1.Schema({
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
// CRITICAL INDEXES for performance
// Unique invoice number per store
saleSchema.index({ storeId: 1, invoiceNumber: 1 }, { unique: true });
// Common query patterns
saleSchema.index({ storeId: 1, date: -1 });
saleSchema.index({ storeId: 1, customerId: 1 });
saleSchema.index({ storeId: 1, status: 1 });
saleSchema.index({ storeId: 1, paymentMethod: 1 });
saleSchema.index({ storeId: 1, createdAt: -1 });
exports.Sale = mongoose_1.default.model('Sale', saleSchema);
