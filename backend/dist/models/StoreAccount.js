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
exports.StoreAccount = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const storeAccountSchema = new mongoose_1.Schema({
    storeId: {
        type: String,
        required: [true, 'Store ID is required'],
        trim: true,
        lowercase: true,
    },
    storeName: {
        type: String,
        required: [true, 'Store name is required'],
        trim: true,
    },
    totalEarned: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalPaid: {
        type: Number,
        default: 0,
        min: 0,
    },
    dueBalance: {
        type: Number,
        default: 0,
        min: 0,
    },
    threshold: {
        type: Number,
        required: [true, 'Threshold is required'],
        default: 10000, // Default threshold of 10,000
        min: 0,
    },
    isPaused: {
        type: Boolean,
        default: false,
    },
    pausedAt: {
        type: Date,
    },
    pausedReason: {
        type: String,
        trim: true,
    },
    lastPaymentDate: {
        type: Date,
    },
    lastPaymentAmount: {
        type: Number,
        min: 0,
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
storeAccountSchema.index({ storeId: 1 }, { unique: true });
storeAccountSchema.index({ isPaused: 1, dueBalance: -1 });
storeAccountSchema.index({ dueBalance: -1 });
exports.StoreAccount = mongoose_1.default.model('StoreAccount', storeAccountSchema);
exports.default = exports.StoreAccount;
