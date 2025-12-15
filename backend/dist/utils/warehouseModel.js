"use strict";
/**
 * @deprecated This file is deprecated. Use the unified Warehouse model directly from ../models/Warehouse
 *
 * All warehouses are now stored in a single unified 'warehouses' collection with storeId field.
 * Use Warehouse model directly and filter by storeId in queries.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWarehouseModelForStore = getWarehouseModelForStore;
const Warehouse_1 = __importDefault(require("../models/Warehouse"));
/**
 * @deprecated Use Warehouse model directly from ../models/Warehouse
 * Get Warehouse model - returns the unified Warehouse model
 * All warehouses are stored in a single collection with storeId field
 */
async function getWarehouseModelForStore(storeId) {
    if (!storeId) {
        throw new Error('Store ID is required to access warehouses');
    }
    // Return the unified Warehouse model
    // Always filter queries by storeId when using this model
    return Warehouse_1.default;
}
