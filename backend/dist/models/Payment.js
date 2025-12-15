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
exports.Payment = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const paymentSchema = new mongoose_1.Schema({
    invoiceId: {
        type: String,
        required: [true, 'Invoice ID is required'],
        index: true,
    },
    storeId: {
        type: String,
        required: [true, 'Store ID is required'],
        trim: true,
        lowercase: true,
        index: true,
    },
    merchantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Merchant',
        default: null,
        index: false, // Explicitly disable automatic index - we use compound indexes instead
    },
    terminalId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.Mixed,
    },
    errorMessage: {
        type: String,
    },
    processedAt: {
        type: Date,
    },
}, {
    timestamps: true,
    autoCreate: false, // Prevent automatic collection creation - only create when data is inserted
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
paymentSchema.index({ storeId: 1, invoiceId: 1 });
paymentSchema.index({ storeId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ storeId: 1, transactionId: 1 });
paymentSchema.index({ storeId: 1, merchantId: 1, terminalId: 1 });
paymentSchema.index({ storeId: 1, merchantId: 1, status: 1 });
exports.Payment = mongoose_1.default.model('Payment', paymentSchema);
