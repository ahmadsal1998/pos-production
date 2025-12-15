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
const mongoose_1 = __importStar(require("mongoose"));
// Product schema definition
const productSchema = new mongoose_1.Schema({
    storeId: {
        type: String,
        required: [true, 'Store ID is required'],
        trim: true,
        lowercase: true,
        // Index is created via compound indexes below
    },
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
    },
    barcode: {
        type: String,
        required: [true, 'Barcode is required'],
        trim: true,
    },
    costPrice: {
        type: Number,
        required: [true, 'Cost price is required'],
        min: [0, 'Cost price cannot be negative'],
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
    },
    stock: {
        type: Number,
        default: 0,
        min: [0, 'Stock cannot be negative'],
    },
    warehouseId: {
        type: String,
        trim: true,
    },
    categoryId: {
        type: String,
        trim: true,
    },
    brandId: {
        type: String,
        trim: true,
    },
    mainUnitId: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    lowStockAlert: {
        type: Number,
        default: 10,
        min: [0, 'Low stock alert cannot be negative'],
    },
    internalSKU: {
        type: String,
        trim: true,
    },
    vatPercentage: {
        type: Number,
        default: 0,
        min: [0, 'VAT percentage cannot be negative'],
        max: [100, 'VAT percentage cannot exceed 100'],
    },
    vatInclusive: {
        type: Boolean,
        default: false,
    },
    productionDate: {
        type: Date,
    },
    expiryDate: {
        type: Date,
    },
    batchNumber: {
        type: String,
        trim: true,
    },
    discountRules: {
        enabled: {
            type: Boolean,
            default: false,
        },
        percentage: {
            type: Number,
            default: 0,
            min: [0, 'Discount percentage cannot be negative'],
            max: [100, 'Discount percentage cannot exceed 100'],
        },
        minQuantity: {
            type: Number,
            min: [1, 'Minimum quantity must be at least 1'],
        },
    },
    wholesalePrice: {
        type: Number,
        min: [0, 'Wholesale price cannot be negative'],
    },
    units: [
        {
            unitName: {
                type: String,
                required: true,
                trim: true,
            },
            barcode: {
                type: String,
                trim: true,
            },
            sellingPrice: {
                type: Number,
                required: true,
                min: [0, 'Selling price cannot be negative'],
            },
            conversionFactor: {
                type: Number,
                default: 1,
                min: [1, 'Conversion factor must be at least 1'],
            },
        },
    ],
    multiWarehouseDistribution: [
        {
            warehouseId: {
                type: String,
                required: true,
                trim: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: [0, 'Quantity cannot be negative'],
            },
        },
    ],
    status: {
        type: String,
        enum: ['active', 'inactive', 'hidden'],
        default: 'active',
    },
    images: [String],
    showInQuickProducts: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
    toJSON: {
        transform: (_doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
// CRITICAL INDEXES for performance at scale
// Compound index for barcode lookups (most frequent query) - MUST BE UNIQUE
productSchema.index({ storeId: 1, barcode: 1 }, { unique: true });
// Compound indexes for common queries
productSchema.index({ storeId: 1, status: 1 });
productSchema.index({ storeId: 1, categoryId: 1 });
productSchema.index({ storeId: 1, brandId: 1 });
productSchema.index({ storeId: 1, showInQuickProducts: 1 });
productSchema.index({ storeId: 1, name: 1 }); // For search
productSchema.index({ storeId: 1, createdAt: -1 }); // For listing
// Index for unit barcode searches (nested field)
productSchema.index({ storeId: 1, 'units.barcode': 1 });
// Index for SKU searches (internalSKU is searched in product listings)
productSchema.index({ storeId: 1, internalSKU: 1 });
// Create model - single unified collection
const Product = mongoose_1.default.model('Product', productSchema);
exports.default = Product;
