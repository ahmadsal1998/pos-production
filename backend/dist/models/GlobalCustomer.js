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
exports.GlobalCustomer = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const globalCustomerStoreSchema = new mongoose_1.Schema({
    storeId: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    customerId: {
        type: String,
        required: true,
        trim: true,
    },
    customerName: {
        type: String,
        required: true,
        trim: true,
    },
    registeredAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });
const globalCustomerSchema = new mongoose_1.Schema({
    globalCustomerId: {
        type: String,
        required: [true, 'Global customer ID is required'],
        trim: true,
        lowercase: true,
    },
    identifierType: {
        type: String,
        enum: ['phone', 'email'],
        required: [true, 'Identifier type is required'],
    },
    name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
    },
    phone: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
    },
    stores: {
        type: [globalCustomerStoreSchema],
        default: [],
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
globalCustomerSchema.index({ globalCustomerId: 1 }, { unique: true });
globalCustomerSchema.index({ phone: 1 });
globalCustomerSchema.index({ email: 1 });
globalCustomerSchema.index({ 'stores.storeId': 1 });
/**
 * Helper function to get or create global customer
 */
globalCustomerSchema.statics.getOrCreateGlobalCustomer = async function (storeId, customerId, customerName, phone, email) {
    // Determine identifier (phone takes priority)
    const identifier = phone || email;
    if (!identifier) {
        throw new Error('Either phone or email is required to create global customer');
    }
    const identifierType = phone ? 'phone' : 'email';
    const globalCustomerId = identifier.toLowerCase().trim();
    // Try to find existing global customer
    let globalCustomer = await this.findOne({ globalCustomerId });
    if (globalCustomer) {
        // Check if store is already linked
        const storeExists = globalCustomer.stores.some((s) => s.storeId === storeId.toLowerCase());
        if (!storeExists) {
            // Add store to existing global customer
            globalCustomer.stores.push({
                storeId: storeId.toLowerCase(),
                customerId,
                customerName,
                registeredAt: new Date(),
            });
            await globalCustomer.save();
        }
    }
    else {
        // Create new global customer
        globalCustomer = await this.create({
            globalCustomerId,
            identifierType,
            name: customerName,
            phone: phone?.trim().toLowerCase(),
            email: email?.trim().toLowerCase(),
            stores: [
                {
                    storeId: storeId.toLowerCase(),
                    customerId,
                    customerName,
                    registeredAt: new Date(),
                },
            ],
        });
    }
    return globalCustomer;
};
exports.GlobalCustomer = mongoose_1.default.model('GlobalCustomer', globalCustomerSchema);
exports.default = exports.GlobalCustomer;
