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
 * Create a pseudo product from a unit when no child products exist
 * This ensures unit barcode searches return accurate pricing and stock information
 * 
 * @param parentProduct - The parent product containing the unit
 * @param unit - The unit that matched the barcode search
 * @param unitBarcode - The barcode that was searched
 * @returns A pseudo product document with unit-specific data
 */
export function createPseudoProductFromUnit(
  parentProduct: any,
  unit: any,
  unitBarcode: string
): ProductDocument {
  // Get all units from parent product
  const allUnits = parentProduct.units || [];
  
  // Find the matched unit's order in the hierarchy
  const matchedUnitOrder = unit.order ?? 0;
  
  // Check if this is the main unit (order 0)
  const isMainUnit = matchedUnitOrder === 0;
  
  // Calculate cumulative conversion factor from main unit to matched unit
  // This matches the calculation in HierarchicalUnitsManager.calculateTotalQuantityAtLevel
  // The calculation multiplies initialQuantity by all unitsInPrevious values from order 1 up to the matched unit's order
  let cumulativeConversionFactor = 1;
  
  if (!isMainUnit && allUnits.length > 0) {
    // Find all units with order >= 1 and <= matchedUnitOrder, sorted by order
    const unitsInPath = allUnits
      .filter((u: any) => {
        const uOrder = u.order ?? 0;
        return uOrder >= 1 && uOrder <= matchedUnitOrder;
      })
      .sort((a: any, b: any) => {
        const aOrder = a.order ?? 0;
        const bOrder = b.order ?? 0;
        return aOrder - bOrder;
      });
    
    // Multiply by all unitsInPrevious values in the path from main unit to matched unit
    // This matches: initialQuantity * unitsInPrevious[order1] * unitsInPrevious[order2] * ... * unitsInPrevious[matchedOrder]
    for (const currentUnit of unitsInPath) {
      const unitsInPrev = currentUnit.unitsInPrevious || 1;
      if (unitsInPrev > 0) {
        cumulativeConversionFactor *= unitsInPrev;
      }
    }
  }
  
  // Calculate cost price for the unit based on parent cost price
  // If this is the main unit (order 0), use parent cost directly
  let unitCostPrice = parentProduct.costPrice || 0;
  
  if (!isMainUnit) {
    // Divide by cumulative conversion factor to get cost per unit
    // For example, if parent cost is 100 for 1 main unit, and cumulative factor is 15,
    // then unit cost is 100 / 15 = 6.67
    if (cumulativeConversionFactor > 0) {
      unitCostPrice = (parentProduct.costPrice || 0) / cumulativeConversionFactor;
    } else if (unit.conversionFactor && unit.conversionFactor > 0) {
      // Fallback to legacy conversionFactor if unitsInPrevious is not available
      unitCostPrice = (parentProduct.costPrice || 0) / unit.conversionFactor;
    }
  }
  
  // Calculate stock for the unit
  // Stock is stored in main units, so we need to convert to this unit
  // This matches the calculation: initialQuantity * cumulativeConversionFactor
  let unitStock = parentProduct.stock || 0;
  
  if (!isMainUnit) {
    // Multiply stock by cumulative conversion factor
    // For example, if parent stock is 1 (in main units) and cumulative factor is 15,
    // then unit stock is 1 * 15 = 15
    if (cumulativeConversionFactor > 0) {
      unitStock = (parentProduct.stock || 0) * cumulativeConversionFactor;
    } else if (unit.conversionFactor && unit.conversionFactor > 0) {
      // Fallback to legacy conversionFactor if unitsInPrevious is not available
      unitStock = (parentProduct.stock || 0) * unit.conversionFactor;
    }
  }
  
  // Create pseudo product with unit-specific data
  const pseudoProduct: any = {
    ...parentProduct,
    _id: parentProduct._id || parentProduct.id,
    id: parentProduct._id?.toString() || parentProduct.id,
    // Override with unit-specific data
    barcode: unitBarcode, // Use the unit barcode, not parent barcode
    price: unit.sellingPrice || parentProduct.price || 0, // Use unit's selling price
    costPrice: unitCostPrice, // Calculated cost price for this unit
    stock: unitStock, // Calculated stock for this unit (matches HierarchicalUnitsManager calculation)
    // Add unit information for reference
    matchedUnit: unit,
    isPseudoProduct: true, // Flag to indicate this is a pseudo product
    // Preserve parent product reference
    parentProductId: parentProduct._id?.toString() || parentProduct.id,
  };
  
  return pseudoProduct as ProductDocument;
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
  // CRITICAL: When a unit barcode matches, try to find the corresponding child product
  // This ensures unit barcodes return child product data, not parent product data
  const productWithUnit = await Product.findOne({
    storeId: storeId.toLowerCase(),
    'units.barcode': trimmedBarcode,
    status: 'active',
  }).lean();

  if (productWithUnit) {
    // Check if this is a parent product (has no parentProductId)
    const isParentProduct = !productWithUnit.parentProductId || 
                           productWithUnit.parentProductId === null || 
                           productWithUnit.parentProductId === '';
    
    if (isParentProduct) {
      // This is a parent product with matching unit barcode
      // Try to find the corresponding child product that has this barcode
      const parentId = productWithUnit._id?.toString() || productWithUnit.id;
      
      // First, try to find a child product with the exact same barcode as the unit barcode
      const childProduct = await Product.findOne({
        storeId: storeId.toLowerCase(),
        parentProductId: parentId,
        barcode: trimmedBarcode,
        status: 'active',
      }).lean();
      
      if (childProduct) {
        // Found child product - cache and return it
        await cache.set(cacheKey, childProduct, 3600);
        return childProduct as any;
      }
      
      // If no child product found with exact barcode match, try to find any child product
      const anyChildProduct = await Product.findOne({
        storeId: storeId.toLowerCase(),
        parentProductId: parentId,
        status: 'active',
      }).lean();
      
      if (anyChildProduct) {
        // Found a child product - cache and return it
        await cache.set(cacheKey, anyChildProduct, 3600);
        return anyChildProduct as any;
      }
      
      // No child product found - create pseudo product from unit data
      // This ensures unit barcode searches return accurate pricing and stock information
      const matchedUnit = productWithUnit.units?.find(
        (u: any) => u.barcode && u.barcode.trim().toLowerCase() === trimmedBarcode.toLowerCase()
      );
      
      if (matchedUnit) {
        const pseudoProduct = createPseudoProductFromUnit(
          productWithUnit,
          matchedUnit,
          trimmedBarcode
        );
        // Cache the pseudo product
        await cache.set(cacheKey, pseudoProduct, 3600);
        return pseudoProduct as any;
      }
      
      // Fallback: return parent product if unit not found (shouldn't happen)
      await cache.set(cacheKey, productWithUnit, 3600);
      return productWithUnit as any;
    } else {
      // This is already a child product - return it directly
      await cache.set(cacheKey, productWithUnit, 3600);
      return productWithUnit as any;
    }
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

