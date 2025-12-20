"use strict";
/**
 * Customer Model Utilities
 *
 * Provides functions to get Customer models with the correct collection name
 * based on whether a store is a trial account.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerModelForStore = getCustomerModelForStore;
const Customer_1 = __importDefault(require("../models/Customer"));
const trialAccountModels_1 = require("./trialAccountModels");
/**
 * Get Customer model with correct collection name based on trial status
 * Trial accounts use 'customers_test' collection, regular accounts use 'customers'
 *
 * @param storeId - The store ID to check
 * @returns Promise<Model<CustomerDocument>> - The Customer model with correct collection
 */
async function getCustomerModelForStore(storeId) {
    if (!storeId) {
        throw new Error('Store ID is required to access customers');
    }
    // Get model with correct collection name based on trial status
    return (0, trialAccountModels_1.getModelForStore)(Customer_1.default, 'customers', storeId);
}
