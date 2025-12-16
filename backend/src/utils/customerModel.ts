/**
 * Customer Model Utilities
 * 
 * Provides functions to get Customer models with the correct collection name
 * based on whether a store is a trial account.
 */

import { Model } from 'mongoose';
import Customer, { CustomerDocument } from '../models/Customer';
import { getModelForStore } from './trialAccountModels';

/**
 * Get Customer model with correct collection name based on trial status
 * Trial accounts use 'customers_test' collection, regular accounts use 'customers'
 * 
 * @param storeId - The store ID to check
 * @returns Promise<Model<CustomerDocument>> - The Customer model with correct collection
 */
export async function getCustomerModelForStore(storeId: string | null | undefined): Promise<Model<CustomerDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access customers');
  }
  
  // Get model with correct collection name based on trial status
  return getModelForStore<CustomerDocument>(Customer, 'customers', storeId);
}

// Re-export for backward compatibility
export type { CustomerDocument } from '../models/Customer';

