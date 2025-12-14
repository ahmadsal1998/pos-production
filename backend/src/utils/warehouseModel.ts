/**
 * @deprecated This file is deprecated. Use the unified Warehouse model directly from ../models/Warehouse
 * 
 * All warehouses are now stored in a single unified 'warehouses' collection with storeId field.
 * Use Warehouse model directly and filter by storeId in queries.
 */

import { Model } from 'mongoose';
import Warehouse, { WarehouseDocument } from '../models/Warehouse';

/**
 * @deprecated Use Warehouse model directly from ../models/Warehouse
 * Get Warehouse model - returns the unified Warehouse model
 * All warehouses are stored in a single collection with storeId field
 */
export async function getWarehouseModelForStore(storeId: string | null | undefined): Promise<Model<WarehouseDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access warehouses');
  }
  
  // Return the unified Warehouse model
  // Always filter queries by storeId when using this model
  return Warehouse as Model<WarehouseDocument>;
}

// Re-export for backward compatibility
export type { WarehouseDocument } from '../models/Warehouse';

