/**
 * Product cache utilities (legacy cleanup only).
 *
 * Product/customer lists are no longer stored in localStorage.
 * IndexedDB (productsDB, etc.) is the single source for bulk product data.
 * localStorage is only used for: auth token, theme, small UI state.
 *
 * This module only provides:
 * - getStoreIdFromToken: shared helper (reads auth token from localStorage).
 * - clearAllProductsCaches: removes legacy localStorage product cache keys (e.g. on logout).
 */

import { getStoreIdFromToken as getStoreId } from '@/lib/utils/storeId';

const CACHE_KEY_PREFIX = 'pos_products_cache_';

export { getStoreId as getStoreIdFromToken };

/**
 * Clear legacy product cache keys from localStorage.
 * Call on logout or during cleanup. New caching uses IndexedDB only.
 */
export function clearAllProductsCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing legacy product caches:', error);
  }
}
