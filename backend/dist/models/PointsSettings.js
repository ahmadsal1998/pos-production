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
exports.PointsSettings = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const pointsSettingsSchema = new mongoose_1.Schema({
    storeId: {
        type: String,
        default: 'global', // Global settings by default
        trim: true,
        lowercase: true,
        index: true,
    },
    userPointsPercentage: {
        type: Number,
        required: [true, 'User points percentage is required'],
        default: 5, // Default 5%
        min: 0,
        max: 100,
    },
    companyProfitPercentage: {
        type: Number,
        required: [true, 'Company profit percentage is required'],
        default: 2, // Default 2%
        min: 0,
        max: 100,
    },
    defaultThreshold: {
        type: Number,
        required: [true, 'Default threshold is required'],
        default: 10000, // Default threshold of 10,000
        min: 0,
    },
    pointsExpirationDays: {
        type: Number,
        min: 1,
    },
    minPurchaseAmount: {
        type: Number,
        min: 0,
    },
    maxPointsPerTransaction: {
        type: Number,
        min: 0,
    },
    pointsValuePerPoint: {
        type: Number,
        default: 0.01, // Default: 1 point = $0.01
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
// Unique settings per store (or global)
pointsSettingsSchema.index({ storeId: 1 }, { unique: true });
exports.PointsSettings = mongoose_1.default.model('PointsSettings', pointsSettingsSchema);
exports.default = exports.PointsSettings;
