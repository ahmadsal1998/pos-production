/**
 * Trial Account Model Utilities
 * 
 * This utility provides functions to get models with the correct collection name
 * based on whether a store is a trial account.
 * 
 * Trial accounts use collections with "_test" suffix (e.g., products_test, customers_test)
 * Regular accounts use standard collections (e.g., products, customers)
 */

import mongoose, { Model } from 'mongoose';
import Store from '../models/Store';

// Cache for store trial status to avoid repeated database queries
const storeTrialStatusCache = new Map<string, boolean>();

/**
 * Check if a store is a trial account
 * @param storeId - The store ID to check
 * @returns Promise<boolean> - true if trial account, false otherwise
 */
export async function isTrialAccount(storeId: string | null | undefined): Promise<boolean> {
  if (!storeId) {
    return false;
  }

  const normalizedStoreId = storeId.toLowerCase().trim();

  // Check cache first
  if (storeTrialStatusCache.has(normalizedStoreId)) {
    return storeTrialStatusCache.get(normalizedStoreId)!;
  }

  // Query database
  try {
    const store = await Store.findOne({ storeId: normalizedStoreId }).select('isTrialAccount').lean();
    const isTrial = store?.isTrialAccount || false;
    
    // Cache the result
    storeTrialStatusCache.set(normalizedStoreId, isTrial);
    
    return isTrial;
  } catch (error) {
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
export async function getCollectionName(baseCollectionName: string, storeId: string | null | undefined): Promise<string> {
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
export function clearTrialStatusCache(storeId?: string | null): void {
  if (storeId) {
    storeTrialStatusCache.delete(storeId.toLowerCase().trim());
  } else {
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
export async function getModelForStore<T>(
  baseModel: Model<T>,
  baseCollectionName: string,
  storeId: string | null | undefined
): Promise<Model<T>> {
  const collectionName = await getCollectionName(baseCollectionName, storeId);
  
  // If collection name is different, create a new model instance with the collection name
  if (collectionName !== baseCollectionName) {
    // Use mongoose.model with collection name override
    // Mongoose caches models by name, so we need a unique model name
    const modelName = `${baseModel.modelName}_${collectionName}`;
    
    // Check if model already exists
    if (mongoose.models[modelName]) {
      return mongoose.models[modelName] as Model<T>;
    }
    
    // Create new model with collection name override
    // We need to get the schema from the base model
    const schema = baseModel.schema;
    return mongoose.model<T>(modelName, schema, collectionName);
  }
  
  // Return the base model if collection name is the same
  return baseModel;
}

