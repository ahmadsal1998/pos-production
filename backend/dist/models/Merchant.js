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
exports.Merchant = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const merchantSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Merchant name is required'],
        trim: true,
    },
    merchantId: {
        type: String,
        required: [true, 'Merchant ID (MID) is required'],
        unique: true,
        trim: true,
        uppercase: true,
    },
    storeId: {
        type: String,
        default: null,
        // Index is created via compound index below
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active',
    },
    description: {
        type: String,
        trim: true,
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
// Indexes
// merchantId index is automatically created by unique: true constraint above
merchantSchema.index({ storeId: 1, status: 1 });
exports.Merchant = mongoose_1.default.model('Merchant', merchantSchema);
