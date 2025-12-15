"use strict";
/**
 * @deprecated This file is deprecated. Use the unified Brand model directly from ../models/Brand
 *
 * All brands are now stored in a single unified 'brands' collection with storeId field.
 * Use Brand model directly and filter by storeId in queries.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBrandModelForStore = getBrandModelForStore;
const Brand_1 = __importDefault(require("../models/Brand"));
/**
 * @deprecated Use Brand model directly from ../models/Brand
 * Get Brand model - returns the unified Brand model
 * All brands are stored in a single collection with storeId field
 */
async function getBrandModelForStore(storeId) {
    if (!storeId) {
        throw new Error('Store ID is required to access brands');
    }
    // Return the unified Brand model
    // Always filter queries by storeId when using this model
    return Brand_1.default;
}
