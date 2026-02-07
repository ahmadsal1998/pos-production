import { getProductByBarcode as getCachedProductByBarcode, invalidateAllProductBarcodeCaches } from '../utils/productCache';
import { getProductModelForStore } from '../utils/productModel';
import { log } from '../utils/logger';

export interface GetByBarcodeResult {
  product: any;
  matchedUnit: any;
  matchedBarcode: string;
}

/**
 * Product service: business logic for product CRUD and barcode lookup.
 * Controllers handle validation and HTTP; this layer encapsulates product rules and cache.
 */
export const productService = {
  /**
   * Get product by barcode (cache-aware). Returns null if not found.
   */
  async getByBarcode(storeId: string, barcode: string): Promise<GetByBarcodeResult | null> {
    const trimmedBarcode = barcode.trim();
    const product = await getCachedProductByBarcode(storeId, trimmedBarcode);
    if (!product) return null;

    const productObj = product as any;
    if (productObj.categoryId) productObj.categoryId = String(productObj.categoryId);
    if (productObj.mainUnitId) productObj.mainUnitId = String(productObj.mainUnitId);

    let matchedUnit = null;
    if (productObj.units && Array.isArray(productObj.units)) {
      matchedUnit = productObj.units.find((u: any) => u.barcode === trimmedBarcode) || null;
    }

    return {
      product: productObj,
      matchedUnit,
      matchedBarcode: trimmedBarcode,
    };
  },

  /**
   * Create a product. Throws on validation/duplicate errors; caller maps to HTTP.
   */
  async create(storeId: string, body: any): Promise<{ product: any }> {
    const Product = await getProductModelForStore(storeId);
    const normalizedStoreId = storeId.toLowerCase();
    const {
      name,
      barcode,
      costPrice,
      price,
      stock = 0,
      initialQuantity,
      warehouseId,
      categoryId,
      brandId,
      description,
      lowStockAlert,
      internalSKU,
      vatPercentage = 0,
      vatInclusive = false,
      productionDate,
      expiryDate,
      batchNumber,
      discountRules,
      wholesalePrice,
      units,
      multiWarehouseDistribution,
      status = 'active',
      showInQuickProducts = false,
    } = body;

    const existingProduct = await Product.findOne({
      storeId: normalizedStoreId,
      barcode: (barcode as string).trim(),
    });
    if (existingProduct) {
      const err = new Error('Product with this barcode already exists') as any;
      err.code = 'DUPLICATE_BARCODE';
      throw err;
    }

    const initialQty = initialQuantity !== undefined ? parseInt(initialQuantity) : parseInt(stock) || 0;
    let totalUnitsInSmallest = 0;

    if (units && Array.isArray(units) && units.length > 0) {
      const sortedUnits = [...units].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      if (sortedUnits.length > 1 && initialQty > 0) {
        let calculatedTotal = initialQty;
        for (let i = 1; i < sortedUnits.length; i++) {
          const currentUnit = sortedUnits[i] as any;
          const unitsInPrev = currentUnit.unitsInPrevious || 1;
          if (unitsInPrev > 0) calculatedTotal = calculatedTotal * unitsInPrev;
        }
        totalUnitsInSmallest = calculatedTotal;
      } else {
        totalUnitsInSmallest = initialQty;
      }
    } else {
      totalUnitsInSmallest = initialQty;
    }

    const productData: any = {
      storeId: normalizedStoreId,
      name: (name as string).trim(),
      barcode: (barcode as string).trim(),
      costPrice: parseFloat(costPrice),
      price: parseFloat(price),
      stock: initialQty,
      total_units: totalUnitsInSmallest,
      status: status || 'active',
    };
    if (warehouseId) productData.warehouseId = (warehouseId as string).trim();
    if (categoryId) productData.categoryId = (categoryId as string).trim();
    if (brandId) productData.brandId = (brandId as string).trim();
    if (description) productData.description = (description as string).trim();
    if (lowStockAlert !== undefined) productData.lowStockAlert = parseInt(lowStockAlert) || 10;
    if (internalSKU) productData.internalSKU = (internalSKU as string).trim();
    if (vatPercentage !== undefined) productData.vatPercentage = parseFloat(vatPercentage) || 0;
    if (vatInclusive !== undefined) productData.vatInclusive = Boolean(vatInclusive);
    if (productionDate) productData.productionDate = new Date(productionDate);
    if (expiryDate) productData.expiryDate = new Date(expiryDate);
    if (batchNumber) productData.batchNumber = (batchNumber as string).trim();
    if (discountRules) productData.discountRules = discountRules;
    if (wholesalePrice !== undefined && wholesalePrice > 0) productData.wholesalePrice = parseFloat(wholesalePrice);
    if (units && Array.isArray(units) && units.length > 0) productData.units = units;
    if (multiWarehouseDistribution && Array.isArray(multiWarehouseDistribution) && multiWarehouseDistribution.length > 0) {
      productData.multiWarehouseDistribution = multiWarehouseDistribution;
    }
    if (showInQuickProducts !== undefined) productData.showInQuickProducts = Boolean(showInQuickProducts);

    const product = await Product.create(productData);
    await invalidateAllProductBarcodeCaches(storeId, product);

    return { product };
  },
};
