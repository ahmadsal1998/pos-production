/**
 * @deprecated This file is deprecated. Use the unified Customer model directly from ../models/Customer
 * 
 * All customers are now stored in a single unified 'customers' collection with storeId field.
 * Use Customer model directly and filter by storeId in queries.
 */

import { Model } from 'mongoose';
import Customer, { CustomerDocument } from '../models/Customer';

/**
 * @deprecated Use Customer model directly from ../models/Customer
 * Get Customer model - returns the unified Customer model
 * All customers are stored in a single collection with storeId field
 */
export async function getCustomerModelForStore(storeId: string | null | undefined): Promise<Model<CustomerDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access customers');
  }
  
  // Return the unified Customer model
  // Always filter queries by storeId when using this model
  return Customer as Model<CustomerDocument>;
}

// Re-export for backward compatibility
export type { CustomerDocument } from '../models/Customer';

