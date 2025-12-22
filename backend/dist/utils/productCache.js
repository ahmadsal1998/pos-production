"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductByBarcode = getProductByBarcode;
exports.invalidateProductCache = invalidateProductCache;
exports.invalidateAllProductBarcodeCaches = invalidateAllProductBarcodeCaches;
exports.invalidateStoreProductCache = invalidateStoreProductCache;
const redis_1 = require("./redis");
const productModel_1 = require("./productModel");
/**
 * Cache key generator for product barcode lookups
 */
function getBarcodeCacheKey(storeId, barcode) {
    return `product:${storeId}:${barcode}`;
}
/**
 * Get product by barcode with Redis caching
 * This is the critical path for POS barcode scans - must be < 5ms at DB level
 *
 * @param storeId - Store ID (from JWT, never from request)
 * @param barcode - Barcode to lookup
 * @returns Product document or null
 */
async function getProductByBarcode(storeId, barcode) {
    const trimmedBarcode = barcode.trim();
    const cacheKey = getBarcodeCacheKey(storeId, trimmedBarcode);
    // Try cache first
    const cached = await redis_1.cache.get(cacheKey);
    if (cached) {
        return cached; // Return cached product
    }
    // Cache miss - query database
    // Get trial-aware Product model
    const Product = await (0, productModel_1.getProductModelForStore)(storeId);
    // Use compound index (storeId, barcode) for optimal performance
    const product = await Product.findOne({
        storeId: storeId.toLowerCase(),
        barcode: trimmedBarcode,
        status: 'active',
    }).lean();
    if (product) {
        // Cache for 1 hour (3600 seconds)
        await redis_1.cache.set(cacheKey, product, 3600);
        return product;
    }
    // Product not found - also check unit barcodes
    const productWithUnit = await Product.findOne({
        storeId: storeId.toLowerCase(),
        'units.barcode': trimmedBarcode,
        status: 'active',
    }).lean();
    if (productWithUnit) {
        // Cache for 1 hour
        await redis_1.cache.set(cacheKey, productWithUnit, 3600);
        return productWithUnit;
    }
    return null;
}
/**
 * Invalidate product cache when product is updated/deleted
 * @param storeId - Store ID
 * @param barcode - Product barcode
 */
async function invalidateProductCache(storeId, barcode) {
    const cacheKey = getBarcodeCacheKey(storeId, barcode.trim());
    await redis_1.cache.del(cacheKey);
}
/**
 * Invalidate all barcode caches for a product (main barcode + all unit barcodes)
 * This ensures that any barcode associated with the product is invalidated
 * @param storeId - Store ID
 * @param product - Product document with barcode and units
 */
async function invalidateAllProductBarcodeCaches(storeId, product) {
    const barcodesToInvalidate = [];
    // Add main barcode
    if (product.barcode && product.barcode.trim()) {
        barcodesToInvalidate.push(product.barcode.trim());
    }
    // Add all unit barcodes
    if (product.units && Array.isArray(product.units)) {
        product.units.forEach((unit) => {
            if (unit.barcode && unit.barcode.trim()) {
                barcodesToInvalidate.push(unit.barcode.trim());
            }
        });
    }
    // Invalidate all barcode caches
    await Promise.all(barcodesToInvalidate.map((barcode) => invalidateProductCache(storeId, barcode)));
}
/**
 * Invalidate all product caches for a store
 * Use this when bulk operations occur
 * @param storeId - Store ID
 */
async function invalidateStoreProductCache(storeId) {
    const pattern = `product:${storeId}:*`;
    await redis_1.cache.delPattern(pattern);
}
