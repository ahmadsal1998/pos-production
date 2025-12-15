"use strict";
/**
 * @deprecated This file is deprecated. Use the unified Customer model directly from ../models/Customer
 *
 * All customers are now stored in a single unified 'customers' collection with storeId field.
 * Use Customer model directly and filter by storeId in queries.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerModelForStore = getCustomerModelForStore;
const Customer_1 = __importDefault(require("../models/Customer"));
/**
 * @deprecated Use Customer model directly from ../models/Customer
 * Get Customer model - returns the unified Customer model
 * All customers are stored in a single collection with storeId field
 */
async function getCustomerModelForStore(storeId) {
    if (!storeId) {
        throw new Error('Store ID is required to access customers');
    }
    // Return the unified Customer model
    // Always filter queries by storeId when using this model
    return Customer_1.default;
}
