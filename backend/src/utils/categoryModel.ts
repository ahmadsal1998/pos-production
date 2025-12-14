/**
 * @deprecated This file is deprecated. Use the unified Category model directly from ../models/Category
 * 
 * All categories are now stored in a single unified 'categories' collection with storeId field.
 * Use Category model directly and filter by storeId in queries.
 */

import { Model } from 'mongoose';
import Category, { CategoryDocument } from '../models/Category';

/**
 * @deprecated Use Category model directly from ../models/Category
 * Get Category model - returns the unified Category model
 * All categories are stored in a single collection with storeId field
 */
export async function getCategoryModelForStore(storeId: string | null | undefined): Promise<Model<CategoryDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access categories');
  }
  
  // Return the unified Category model
  // Always filter queries by storeId when using this model
  return Category as Model<CategoryDocument>;
}

// Re-export for backward compatibility
export type { CategoryDocument } from '../models/Category';

