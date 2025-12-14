/**
 * @deprecated This file is deprecated. Use the unified Brand model directly from ../models/Brand
 * 
 * All brands are now stored in a single unified 'brands' collection with storeId field.
 * Use Brand model directly and filter by storeId in queries.
 */

import { Model } from 'mongoose';
import Brand, { BrandDocument } from '../models/Brand';

/**
 * @deprecated Use Brand model directly from ../models/Brand
 * Get Brand model - returns the unified Brand model
 * All brands are stored in a single collection with storeId field
 */
export async function getBrandModelForStore(storeId: string | null | undefined): Promise<Model<BrandDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access brands');
  }
  
  // Return the unified Brand model
  // Always filter queries by storeId when using this model
  return Brand as Model<BrandDocument>;
}

// Re-export for backward compatibility
export type { BrandDocument } from '../models/Brand';

