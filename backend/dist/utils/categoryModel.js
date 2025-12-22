"use strict";
/**
 * @deprecated This file is deprecated. Use the unified Category model directly from ../models/Category
 *
 * All categories are now stored in a single unified 'categories' collection with storeId field.
 * Use Category model directly and filter by storeId in queries.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryModelForStore = getCategoryModelForStore;
const Category_1 = __importDefault(require("../models/Category"));
/**
 * @deprecated Use Category model directly from ../models/Category
 * Get Category model - returns the unified Category model
 * All categories are stored in a single collection with storeId field
 */
async function getCategoryModelForStore(storeId) {
    if (!storeId) {
        throw new Error('Store ID is required to access categories');
    }
    // Return the unified Category model
    // Always filter queries by storeId when using this model
    return Category_1.default;
}
