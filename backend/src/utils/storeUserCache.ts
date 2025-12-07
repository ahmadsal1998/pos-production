/**
 * Store-User Mapping Cache
 * 
 * This cache stores mappings between user identifiers (email, username) and their storeId.
 * This allows us to quickly find which store a user belongs to without searching across all stores.
 * 
 * Cache invalidation:
 * - When a user is created, updated, or deleted
 * - When a user's storeId changes
 * - Cache expires after 1 hour (configurable)
 */

interface CacheEntry {
  storeId: string;
  timestamp: number;
}

// Cache configuration
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// In-memory cache: email -> storeId mapping
const emailToStoreCache: Map<string, CacheEntry> = new Map();

// In-memory cache: username -> storeId mapping
const usernameToStoreCache: Map<string, CacheEntry> = new Map();

/**
 * Get storeId for an email from cache
 * @param email - User email
 * @returns StoreId or null if not cached or expired
 */
export function getStoreIdForEmail(email: string): string | null {
  const normalizedEmail = email.toLowerCase().trim();
  const entry = emailToStoreCache.get(normalizedEmail);
  
  if (!entry) {
    return null;
  }
  
  // Check if cache entry has expired
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    emailToStoreCache.delete(normalizedEmail);
    return null;
  }
  
  return entry.storeId;
}

/**
 * Get storeId for a username from cache
 * @param username - Username
 * @returns StoreId or null if not cached or expired
 */
export function getStoreIdForUsername(username: string): string | null {
  const normalizedUsername = username.toLowerCase().trim();
  const entry = usernameToStoreCache.get(normalizedUsername);
  
  if (!entry) {
    return null;
  }
  
  // Check if cache entry has expired
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    usernameToStoreCache.delete(normalizedUsername);
    return null;
  }
  
  return entry.storeId;
}

/**
 * Cache a mapping between email and storeId
 * @param email - User email
 * @param storeId - Store ID
 */
export function cacheEmailToStore(email: string, storeId: string | null): void {
  if (!storeId) {
    return; // Don't cache null storeIds (system users)
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  emailToStoreCache.set(normalizedEmail, {
    storeId: storeId.toLowerCase(),
    timestamp: Date.now(),
  });
}

/**
 * Cache a mapping between username and storeId
 * @param username - Username
 * @param storeId - Store ID
 */
export function cacheUsernameToStore(username: string, storeId: string | null): void {
  if (!storeId) {
    return; // Don't cache null storeIds (system users)
  }
  
  const normalizedUsername = username.toLowerCase().trim();
  usernameToStoreCache.set(normalizedUsername, {
    storeId: storeId.toLowerCase(),
    timestamp: Date.now(),
  });
}

/**
 * Invalidate cache entries for a user
 * @param email - User email (optional)
 * @param username - Username (optional)
 */
export function invalidateUserCache(email?: string, username?: string): void {
  if (email) {
    emailToStoreCache.delete(email.toLowerCase().trim());
  }
  if (username) {
    usernameToStoreCache.delete(username.toLowerCase().trim());
  }
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  emailToStoreCache.clear();
  usernameToStoreCache.clear();
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats(): {
  emailCacheSize: number;
  usernameCacheSize: number;
} {
  return {
    emailCacheSize: emailToStoreCache.size,
    usernameCacheSize: usernameToStoreCache.size,
  };
}

