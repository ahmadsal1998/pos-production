"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerPaymentModel = getCustomerPaymentModel;
exports.getCustomerPaymentModelForStore = getCustomerPaymentModelForStore;
const mongoose_1 = require("mongoose");
const Store_1 = __importDefault(require("../models/Store"));
const databaseManager_1 = require("./databaseManager");
// Customer Payment schema definition
const customerPaymentSchema = new mongoose_1.Schema({
    customerId: {
        type: String,
        required: [true, 'Customer ID is required'],
        index: true,
    },
    storeId: {
        type: String,
        index: true,
        default: null,
    },
    date: {
        type: Date,
        required: [true, 'Payment date is required'],
        default: Date.now,
        index: true,
    },
    amount: {
        type: Number,
        required: [true, 'Payment amount is required'],
        // Allow negative amounts for debt operations (positive for balance, negative for debt)
    },
    method: {
        type: String,
        enum: ['Cash', 'Bank Transfer', 'Cheque'],
        required: [true, 'Payment method is required'],
        index: true,
    },
    invoiceId: {
        type: String,
        index: true,
        default: null,
    },
    notes: {
        type: String,
        trim: true,
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
customerPaymentSchema.index({ customerId: 1, storeId: 1 });
customerPaymentSchema.index({ date: -1, storeId: 1 });
customerPaymentSchema.index({ method: 1, storeId: 1 });
customerPaymentSchema.index({ invoiceId: 1, storeId: 1 });
/**
 * Get store prefix from storeId
 * @param storeId - Store ID to get prefix for
 * @returns Store prefix or null if not found
 */
async function getStorePrefix(storeId) {
    try {
        const normalizedStoreId = storeId.toLowerCase().trim();
        // Try to find by storeId first
        let store = await Store_1.default.findOne({ storeId: normalizedStoreId }).lean();
        // If not found, try by prefix (in case storeId is actually a prefix)
        if (!store) {
            store = await Store_1.default.findOne({ prefix: normalizedStoreId }).lean();
        }
        if (store && store.prefix) {
            return store.prefix;
        }
        return null;
    }
    catch (error) {
        console.error(`Error getting store prefix for ${storeId}:`, error);
        throw new Error(`Failed to get store prefix: ${error.message}`);
    }
}
/**
 * Get a Mongoose model for a store-specific Customer Payment collection
 * @param prefix - Store prefix (e.g., 'store1')
 * @param databaseId - Database ID where the collection is stored
 * @returns Mongoose model for the store-specific Customer Payment collection
 */
async function getCustomerPaymentModel(prefix, databaseId) {
    if (!prefix) {
        throw new Error('Store prefix is required for customer payment model');
    }
    // If databaseId is not provided, we need to get it from the Store model
    let finalDatabaseId = databaseId;
    if (!finalDatabaseId) {
        finalDatabaseId = await (0, databaseManager_1.getDatabaseIdForStore)(prefix, Store_1.default);
        if (!finalDatabaseId) {
            throw new Error(`Database ID not found for store with prefix: ${prefix}`);
        }
    }
    const dbId = finalDatabaseId;
    // Validate and sanitize prefix
    const sanitizedPrefix = prefix.toLowerCase().trim();
    if (!sanitizedPrefix || !/^[a-z0-9_]+$/.test(sanitizedPrefix)) {
        throw new Error(`Invalid store prefix: ${prefix}. Prefix can only contain lowercase letters, numbers, and underscores.`);
    }
    const collectionName = `${sanitizedPrefix}_customer_payments`;
    // Validate collection name (MongoDB restrictions)
    if (collectionName.length > 255) {
        throw new Error(`Collection name too long: ${collectionName}. Maximum length is 255 characters.`);
    }
    // Get the connection for this database
    const connection = await (0, databaseManager_1.getDatabaseConnection)(dbId);
    const connectionDbName = connection.db?.databaseName;
    if (connectionDbName && connectionDbName !== (0, databaseManager_1.getDatabaseName)(dbId)) {
        console.warn(`⚠️ Database name mismatch: Expected ${(0, databaseManager_1.getDatabaseName)(dbId)}, got ${connectionDbName}`);
    }
    // Check if model already exists in this connection
    if (connection.models[collectionName]) {
        return connection.models[collectionName];
    }
    // Create new model with the collection name on the specific connection
    return connection.model(collectionName, customerPaymentSchema, collectionName);
}
/**
 * Get Customer Payment model for a user's store
 * @param storeId - User's storeId
 * @returns Mongoose model for the user's store Customer Payment collection
 */
async function getCustomerPaymentModelForStore(storeId) {
    if (!storeId) {
        throw new Error('Store ID is required to access customer payments');
    }
    const prefix = await getStorePrefix(storeId);
    const databaseId = await (0, databaseManager_1.getDatabaseIdForStore)(storeId, Store_1.default);
    if (!databaseId) {
        throw new Error(`Database ID not found for store: ${storeId}`);
    }
    return getCustomerPaymentModel(prefix, databaseId);
}
