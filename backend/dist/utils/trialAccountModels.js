"use strict";
/**
 * Trial Account Model Utilities
 *
 * This utility provides functions to get models with the correct collection name
 * based on whether a store is a trial account.
 *
 * Trial accounts use collections with "_test" suffix (e.g., products_test, customers_test)
 * Regular accounts use standard collections (e.g., products, customers)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTrialAccount = isTrialAccount;
exports.getCollectionName = getCollectionName;
exports.clearTrialStatusCache = clearTrialStatusCache;
exports.getModelForStore = getModelForStore;
const mongoose_1 = __importDefault(require("mongoose"));
const Store_1 = __importDefault(require("../models/Store"));
// Cache for store trial status to avoid repeated database queries
const storeTrialStatusCache = new Map();
/**
 * Check if a store is a trial account
 * @param storeId - The store ID to check
 * @returns Promise<boolean> - true if trial account, false otherwise
 */
async function isTrialAccount(storeId) {
    if (!storeId) {
        return false;
    }
    const normalizedStoreId = storeId.toLowerCase().trim();
    // Check cache first
    if (storeTrialStatusCache.has(normalizedStoreId)) {
        return storeTrialStatusCache.get(normalizedStoreId);
    }
    // Query database
    try {
        const store = await Store_1.default.findOne({ storeId: normalizedStoreId }).select('isTrialAccount').lean();
        const isTrial = store?.isTrialAccount || false;
        // Cache the result
        storeTrialStatusCache.set(normalizedStoreId, isTrial);
        return isTrial;
    }
    catch (error) {
        console.error(`Error checking trial status for store ${normalizedStoreId}:`, error);
        return false; // Default to non-trial on error
    }
}
/**
 * Get the collection name for a model based on trial status
 * @param baseCollectionName - The base collection name (e.g., 'products', 'customers')
 * @param storeId - The store ID to check
 * @returns Promise<string> - The collection name (with _test suffix if trial account)
 */
async function getCollectionName(baseCollectionName, storeId) {
    if (!storeId) {
        return baseCollectionName;
    }
    const isTrial = await isTrialAccount(storeId);
    return isTrial ? `${baseCollectionName}_test` : baseCollectionName;
}
/**
 * Clear the trial status cache for a store (call this when store is updated)
 * @param storeId - The store ID to clear from cache
 */
function clearTrialStatusCache(storeId) {
    if (storeId) {
        storeTrialStatusCache.delete(storeId.toLowerCase().trim());
    }
    else {
        storeTrialStatusCache.clear();
    }
}
/**
 * Get a model instance with the correct collection name
 * This uses Mongoose's ability to override collection names dynamically
 *
 * @param baseModel - The base model (e.g., Product, Customer)
 * @param baseCollectionName - The base collection name (e.g., 'products', 'customers')
 * @param storeId - The store ID to check
 * @returns Promise<Model> - The model with collection name overridden
 */
async function getModelForStore(baseModel, baseCollectionName, storeId) {
    const collectionName = await getCollectionName(baseCollectionName, storeId);
    // If collection name is different, create a new model instance with the collection name
    if (collectionName !== baseCollectionName) {
        // Use mongoose.model with collection name override
        // Mongoose caches models by name, so we need a unique model name
        const modelName = `${baseModel.modelName}_${collectionName}`;
        // Check if model already exists
        if (mongoose_1.default.models[modelName]) {
            return mongoose_1.default.models[modelName];
        }
        // Create new model with collection name override
        // We need to get the schema from the base model
        const schema = baseModel.schema;
        return mongoose_1.default.model(modelName, schema, collectionName);
    }
    // Return the base model if collection name is the same
    return baseModel;
}
