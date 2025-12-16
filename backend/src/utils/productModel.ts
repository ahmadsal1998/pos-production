/**
 * Product Model Utilities
 * 
 * Provides functions to get Product models with the correct collection name
 * based on whether a store is a trial account.
 */

import { Model } from 'mongoose';
import Product, { ProductDocument } from '../models/Product';
import { getModelForStore } from './trialAccountModels';

/**
 * Get Product model with correct collection name based on trial status
 * Trial accounts use 'products_test' collection, regular accounts use 'products'
 * 
 * @param storeId - The store ID to check
 * @returns Promise<Model<ProductDocument>> - The Product model with correct collection
 */
export async function getProductModelForStore(
  storeId: string | null | undefined
): Promise<Model<ProductDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access products');
  }
  
  // Get model with correct collection name based on trial status
  return getModelForStore<ProductDocument>(Product, 'products', storeId);
}

// Re-export for backward compatibility
export type { ProductDocument } from '../models/Product';

