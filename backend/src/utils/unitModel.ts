/**
 * @deprecated This file is deprecated. Use the unified Unit model directly from ../models/Unit
 * 
 * All units are now stored in a single unified 'units' collection with storeId field.
 * Use Unit model directly and filter by storeId in queries.
 */

import { Model } from 'mongoose';
import Unit, { UnitDocument } from '../models/Unit';

/**
 * @deprecated Use Unit model directly from ../models/Unit
 * Get Unit model - returns the unified Unit model
 * All units are stored in a single collection with storeId field
 */
export async function getUnitModelForStore(storeId: string | null | undefined): Promise<Model<UnitDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access units');
  }
  
  // Return the unified Unit model
  // Always filter queries by storeId when using this model
  return Unit as Model<UnitDocument>;
}

// Re-export for backward compatibility
export type { UnitDocument } from '../models/Unit';

