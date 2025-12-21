"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreIdForEmail = getStoreIdForEmail;
exports.getStoreIdForUsername = getStoreIdForUsername;
exports.cacheEmailToStore = cacheEmailToStore;
exports.cacheUsernameToStore = cacheUsernameToStore;
exports.invalidateUserCache = invalidateUserCache;
exports.clearCache = clearCache;
exports.getCacheStats = getCacheStats;
// Cache configuration
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
// In-memory cache: email -> storeId mapping
const emailToStoreCache = new Map();
// In-memory cache: username -> storeId mapping
const usernameToStoreCache = new Map();
/**
 * Get storeId for an email from cache
 * @param email - User email
 * @returns StoreId or null if not cached or expired
 */
function getStoreIdForEmail(email) {
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
function getStoreIdForUsername(username) {
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
function cacheEmailToStore(email, storeId) {
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
function cacheUsernameToStore(username, storeId) {
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
function invalidateUserCache(email, username) {
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
function clearCache() {
    emailToStoreCache.clear();
    usernameToStoreCache.clear();
}
/**
 * Get cache statistics (for monitoring)
 */
function getCacheStats() {
    return {
        emailCacheSize: emailToStoreCache.size,
        usernameCacheSize: usernameToStoreCache.size,
    };
}
