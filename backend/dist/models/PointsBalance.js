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
exports.PointsBalance = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const pointsBalanceSchema = new mongoose_1.Schema({
    globalCustomerId: {
        type: String,
        required: [true, 'Global customer ID is required'],
        unique: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    customerName: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
    },
    customerPhone: {
        type: String,
        trim: true,
        index: true,
    },
    customerEmail: {
        type: String,
        trim: true,
        lowercase: true,
        index: true,
    },
    totalPoints: {
        type: Number,
        default: 0,
        min: 0,
    },
    availablePoints: {
        type: Number,
        default: 0,
        min: 0,
    },
    pendingPoints: {
        type: Number,
        default: 0,
        min: 0,
    },
    lifetimeEarned: {
        type: Number,
        default: 0,
        min: 0,
    },
    lifetimeSpent: {
        type: Number,
        default: 0,
        min: 0,
    },
    lastTransactionDate: {
        type: Date,
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
// Unique global customer
pointsBalanceSchema.index({ globalCustomerId: 1 }, { unique: true });
// Search by phone or email
pointsBalanceSchema.index({ customerPhone: 1 });
pointsBalanceSchema.index({ customerEmail: 1 });
// List balances
pointsBalanceSchema.index({ totalPoints: -1 });
pointsBalanceSchema.index({ createdAt: -1 });
exports.PointsBalance = mongoose_1.default.model('PointsBalance', pointsBalanceSchema);
exports.default = exports.PointsBalance;
