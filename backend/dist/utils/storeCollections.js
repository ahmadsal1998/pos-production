"use strict";
/**
 * @deprecated This file is deprecated. All collections now use unified collections with storeId.
 *
 * This file is kept for backward compatibility but all functions are no-ops or return empty results.
 * All models now use unified collections:
 * - Product, Customer, Category, Brand, Unit, Sale, Warehouse all use unified collections with storeId
 * - Collections are created automatically by Mongoose when first document is inserted
 *
 * DO NOT USE THESE FUNCTIONS FOR NEW CODE.
 * Use the unified models directly from ../models/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreCollectionName = getStoreCollectionName;
exports.getStoreModel = getStoreModel;
exports.getDatabase = getDatabase;
exports.collectionExists = collectionExists;
exports.ensureCollectionExists = ensureCollectionExists;
exports.createStoreCollections = createStoreCollections;
const databaseManager_1 = require("./databaseManager");
/**
 * @deprecated No longer needed - collections are unified with storeId
 */
function getStoreCollectionName(prefix, collectionType) {
    console.warn('⚠️ getStoreCollectionName is deprecated. Use unified collections with storeId instead.');
    return `${prefix.toLowerCase()}_${collectionType}`;
}
/**
 * @deprecated No longer needed - use unified models directly
 */
async function getStoreModel(prefix, collectionType, schema, databaseId) {
    console.warn('⚠️ getStoreModel is deprecated. Use unified models directly from ../models/');
    throw new Error('getStoreModel is deprecated. Use unified models with storeId instead.');
}
/**
 * Get the database instance for a specific database
 * @param databaseId - Database ID (1-5)
 * @returns MongoDB database instance
 */
async function getDatabase(databaseId) {
    const connection = await (0, databaseManager_1.getDatabaseConnection)(databaseId);
    return connection.db;
}
/**
 * @deprecated No longer needed - collections are unified with storeId
 */
async function collectionExists(prefix, collectionType, databaseId) {
    console.warn('⚠️ collectionExists is deprecated. Collections are now unified with storeId.');
    return false;
}
/**
 * @deprecated No longer needed - collections are created automatically by Mongoose
 */
async function ensureCollectionExists(prefix, collectionType, databaseId) {
    console.warn('⚠️ ensureCollectionExists is deprecated. Collections are created automatically by Mongoose.');
    // No-op - collections are created automatically
}
/**
 * @deprecated No longer needed - collections are unified with storeId and created automatically
 */
async function createStoreCollections(prefix, databaseId, storeId) {
    console.warn('⚠️ createStoreCollections is deprecated. All collections are now unified with storeId and created automatically by Mongoose.');
    // No-op - collections are created automatically when first document is inserted
}
