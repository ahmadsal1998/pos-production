"use strict";
/**
 * @deprecated This file is deprecated. Use the unified Product model directly from ../models/Product
 *
 * All products are now stored in a single unified 'products' collection with storeId field.
 * Use Product model directly and filter by storeId in queries.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductModelForStore = getProductModelForStore;
const Product_1 = __importDefault(require("../models/Product"));
/**
 * @deprecated Use Product model directly from ../models/Product
 * Get Product model - returns the unified Product model
 * All products are stored in a single collection with storeId field
 */
async function getProductModelForStore(storeId) {
    if (!storeId) {
        throw new Error('Store ID is required to access products');
    }
    // Return the unified Product model
    // Always filter queries by storeId when using this model
    return Product_1.default;
}
