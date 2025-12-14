// Products cache utility for efficient product data management
// Reduces API requests by caching products locally

interface CachedProducts {
  products: any[];
  categories: Record<string, any>;
  timestamp: number;
  storeId: string;
}

const CACHE_KEY_PREFIX = 'pos_products_cache_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

/**
 * Get cache key for a store
 */
function getCacheKey(storeId: string): string {
  return `${CACHE_KEY_PREFIX}${storeId}`;
}

/**
 * Get cached products for a store
 */
export function getCachedProducts(storeId: string): CachedProducts | null {
  try {
    const cacheKey = getCacheKey(storeId);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }

    const data: CachedProducts = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
    if (now - data.timestamp > CACHE_DURATION) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    // Verify storeId matches (security check)
    if (data.storeId !== storeId) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading products cache:', error);
    return null;
  }
}

/**
 * Set cached products for a store
 */
export function setCachedProducts(storeId: string, products: any[], categories: Record<string, any>): void {
  try {
    const cacheKey = getCacheKey(storeId);
    const data: CachedProducts = {
      products,
      categories,
      timestamp: Date.now(),
      storeId,
    };

    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing products cache:', error);
    // If storage is full, try to clear old caches
    try {
      clearExpiredCaches();
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (retryError) {
      console.error('Failed to write products cache after cleanup:', retryError);
    }
  }
}

/**
 * Invalidate cached products for a store
 */
export function invalidateProductsCache(storeId: string): void {
  try {
    const cacheKey = getCacheKey(storeId);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error('Error invalidating products cache:', error);
  }
}

/**
 * Clear all expired product caches
 */
function clearExpiredCaches(): void {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const data: CachedProducts = JSON.parse(cached);
            if (now - data.timestamp > CACHE_DURATION) {
              keysToRemove.push(key);
            }
          }
        } catch (e) {
          // Invalid cache entry, remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing expired caches:', error);
  }
}

/**
 * Clear all product caches (for logout, etc.)
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

    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing all product caches:', error);
  }
}

/**
 * Get storeId from auth token (helper function)
 */
export function getStoreIdFromToken(): string | null {
  try {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      return null;
    }

    // Decode JWT token (simple base64 decode)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.storeId || null;
  } catch (error) {
    console.error('Error getting storeId from token:', error);
    return null;
  }
}

