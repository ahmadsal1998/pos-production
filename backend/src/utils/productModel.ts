/**
 * @deprecated This file is deprecated. Use the unified Product model directly from ../models/Product
 * 
 * All products are now stored in a single unified 'products' collection with storeId field.
 * Use Product model directly and filter by storeId in queries.
 */

import { Model } from 'mongoose';
import Product, { ProductDocument } from '../models/Product';

/**
 * @deprecated Use Product model directly from ../models/Product
 * Get Product model - returns the unified Product model
 * All products are stored in a single collection with storeId field
 */
export async function getProductModelForStore(
  storeId: string | null | undefined
): Promise<Model<ProductDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access products');
  }
  
  // Return the unified Product model
  // Always filter queries by storeId when using this model
  return Product as Model<ProductDocument>;
}

// Re-export for backward compatibility
export type { ProductDocument } from '../models/Product';

