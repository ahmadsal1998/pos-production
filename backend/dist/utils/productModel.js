"use strict";
/**
 * Product Model Utilities
 *
 * Provides functions to get Product models with the correct collection name
 * based on whether a store is a trial account.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductModelForStore = getProductModelForStore;
const Product_1 = __importDefault(require("../models/Product"));
const trialAccountModels_1 = require("./trialAccountModels");
/**
 * Get Product model with correct collection name based on trial status
 * Trial accounts use 'products_test' collection, regular accounts use 'products'
 *
 * @param storeId - The store ID to check
 * @returns Promise<Model<ProductDocument>> - The Product model with correct collection
 */
async function getProductModelForStore(storeId) {
    if (!storeId) {
        throw new Error('Store ID is required to access products');
    }
    // Get model with correct collection name based on trial status
    return (0, trialAccountModels_1.getModelForStore)(Product_1.default, 'products', storeId);
}
