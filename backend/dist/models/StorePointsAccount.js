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
exports.StorePointsAccount = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const storePointsAccountSchema = new mongoose_1.Schema({
    storeId: {
        type: String,
        required: [true, 'Store ID is required'],
        unique: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    storeName: {
        type: String,
        required: [true, 'Store name is required'],
        trim: true,
    },
    totalPointsIssued: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalPointsRedeemed: {
        type: Number,
        default: 0,
        min: 0,
    },
    netPointsBalance: {
        type: Number,
        default: 0,
    },
    pointsValuePerPoint: {
        type: Number,
        default: 0.01, // Default: 1 point = $0.01
        min: 0,
    },
    totalPointsValueIssued: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalPointsValueRedeemed: {
        type: Number,
        default: 0,
        min: 0,
    },
    netFinancialBalance: {
        type: Number,
        default: 0,
    },
    amountOwed: {
        type: Number,
        default: 0,
        min: 0,
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
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
// Indexes
storePointsAccountSchema.index({ storeId: 1 }, { unique: true });
storePointsAccountSchema.index({ netPointsBalance: -1 });
storePointsAccountSchema.index({ amountOwed: -1 });
storePointsAccountSchema.index({ lastUpdated: -1 });
/**
 * Recalculate account balances based on current values
 */
storePointsAccountSchema.methods.recalculate = function () {
    this.netPointsBalance = this.totalPointsIssued - this.totalPointsRedeemed;
    this.totalPointsValueIssued = this.totalPointsIssued * this.pointsValuePerPoint;
    this.totalPointsValueRedeemed = this.totalPointsRedeemed * this.pointsValuePerPoint;
    this.netFinancialBalance = this.totalPointsValueIssued - this.totalPointsValueRedeemed;
    // Amount owed is always positive
    // If netFinancialBalance > 0: Store owes value of unused points
    // If netFinancialBalance < 0: Store owes value of extra points redeemed
    this.amountOwed = Math.abs(this.netFinancialBalance);
    this.lastUpdated = new Date();
};
exports.StorePointsAccount = mongoose_1.default.model('StorePointsAccount', storePointsAccountSchema);
exports.default = exports.StorePointsAccount;
