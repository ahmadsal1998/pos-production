"use strict";
/**
 * @deprecated This file is deprecated. Use the unified Unit model directly from ../models/Unit
 *
 * All units are now stored in a single unified 'units' collection with storeId field.
 * Use Unit model directly and filter by storeId in queries.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnitModelForStore = getUnitModelForStore;
const Unit_1 = __importDefault(require("../models/Unit"));
/**
 * @deprecated Use Unit model directly from ../models/Unit
 * Get Unit model - returns the unified Unit model
 * All units are stored in a single collection with storeId field
 */
async function getUnitModelForStore(storeId) {
    if (!storeId) {
        throw new Error('Store ID is required to access units');
    }
    // Return the unified Unit model
    // Always filter queries by storeId when using this model
    return Unit_1.default;
}
