import { cache } from './redis';
import { ProductDocument } from '../models/Product';
import { getProductModelForStore } from './productModel';

/**
 * Cache key generator for product barcode lookups
 */
function getBarcodeCacheKey(storeId: string, barcode: string): string {
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
export async function getProductByBarcode(
  storeId: string,
  barcode: string
): Promise<ProductDocument | null> {
  const trimmedBarcode = barcode.trim();
  const cacheKey = getBarcodeCacheKey(storeId, trimmedBarcode);

  // Try cache first
  const cached = await cache.get<ProductDocument>(cacheKey);
  if (cached) {
    return cached as any; // Return cached product
  }

  // Cache miss - query database
  // Get trial-aware Product model
  const Product = await getProductModelForStore(storeId);
  
  // Use compound index (storeId, barcode) for optimal performance
  const product = await Product.findOne({
    storeId: storeId.toLowerCase(),
    barcode: trimmedBarcode,
    status: 'active',
  }).lean();

  if (product) {
    // Cache for 1 hour (3600 seconds)
    await cache.set(cacheKey, product, 3600);
    return product as any;
  }

  // Product not found - also check unit barcodes
  const productWithUnit = await Product.findOne({
    storeId: storeId.toLowerCase(),
    'units.barcode': trimmedBarcode,
    status: 'active',
  }).lean();

  if (productWithUnit) {
    // Cache for 1 hour
    await cache.set(cacheKey, productWithUnit, 3600);
    return productWithUnit as any;
  }

  return null;
}

/**
 * Invalidate product cache when product is updated/deleted
 * @param storeId - Store ID
 * @param barcode - Product barcode
 */
export async function invalidateProductCache(storeId: string, barcode: string): Promise<void> {
  const cacheKey = getBarcodeCacheKey(storeId, barcode.trim());
  await cache.del(cacheKey);
}

/**
 * Invalidate all barcode caches for a product (main barcode + all unit barcodes)
 * This ensures that any barcode associated with the product is invalidated
 * @param storeId - Store ID
 * @param product - Product document with barcode and units
 */
export async function invalidateAllProductBarcodeCaches(
  storeId: string,
  product: { barcode?: string; units?: Array<{ barcode?: string }> }
): Promise<void> {
  const barcodesToInvalidate: string[] = [];

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
  await Promise.all(
    barcodesToInvalidate.map((barcode) => invalidateProductCache(storeId, barcode))
  );
}

/**
 * Invalidate all product caches for a store
 * Use this when bulk operations occur
 * @param storeId - Store ID
 */
export async function invalidateStoreProductCache(storeId: string): Promise<void> {
  const pattern = `product:${storeId}:*`;
  await cache.delPattern(pattern);
}

