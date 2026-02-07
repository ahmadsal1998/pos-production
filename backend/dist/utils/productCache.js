"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var productCache_exports = {};
__export(productCache_exports, {
  createPseudoProductFromUnit: () => createPseudoProductFromUnit,
  getProductByBarcode: () => getProductByBarcode,
  invalidateAllProductBarcodeCaches: () => invalidateAllProductBarcodeCaches,
  invalidateProductCache: () => invalidateProductCache,
  invalidateStoreProductCache: () => invalidateStoreProductCache
});
module.exports = __toCommonJS(productCache_exports);
var import_redis = require("./redis");
var import_productModel = require("./productModel");
var import_scaleBarcode = require("./scaleBarcode");
function getBarcodeCacheKey(storeId, barcode) {
  return `product:${storeId}:${barcode}`;
}
function createPseudoProductFromUnit(parentProduct, unit, unitBarcode) {
  const allUnits = parentProduct.units || [];
  const matchedUnitOrder = unit.order ?? 0;
  const isMainUnit = matchedUnitOrder === 0;
  let cumulativeConversionFactor = 1;
  if (!isMainUnit && allUnits.length > 0) {
    const unitsInPath = allUnits.filter((u) => {
      const uOrder = u.order ?? 0;
      return uOrder >= 1 && uOrder <= matchedUnitOrder;
    }).sort((a, b) => {
      const aOrder = a.order ?? 0;
      const bOrder = b.order ?? 0;
      return aOrder - bOrder;
    });
    for (const currentUnit of unitsInPath) {
      const unitsInPrev = currentUnit.unitsInPrevious || 1;
      if (unitsInPrev > 0) {
        cumulativeConversionFactor *= unitsInPrev;
      }
    }
  }
  let unitCostPrice = parentProduct.costPrice || 0;
  if (!isMainUnit) {
    if (cumulativeConversionFactor > 0) {
      unitCostPrice = (parentProduct.costPrice || 0) / cumulativeConversionFactor;
    } else if (unit.conversionFactor && unit.conversionFactor > 0) {
      unitCostPrice = (parentProduct.costPrice || 0) / unit.conversionFactor;
    }
  }
  let unitStock = parentProduct.stock || 0;
  if (!isMainUnit) {
    if (cumulativeConversionFactor > 0) {
      unitStock = (parentProduct.stock || 0) * cumulativeConversionFactor;
    } else if (unit.conversionFactor && unit.conversionFactor > 0) {
      unitStock = (parentProduct.stock || 0) * unit.conversionFactor;
    }
  }
  const pseudoProduct = {
    ...parentProduct,
    _id: parentProduct._id || parentProduct.id,
    id: parentProduct._id?.toString() || parentProduct.id,
    // Override with unit-specific data
    barcode: unitBarcode,
    // Use the unit barcode, not parent barcode
    price: unit.sellingPrice || parentProduct.price || 0,
    // Use unit's selling price
    costPrice: unitCostPrice,
    // Calculated cost price for this unit
    stock: unitStock,
    // Calculated stock for this unit (matches HierarchicalUnitsManager calculation)
    // Add unit information for reference
    matchedUnit: unit,
    isPseudoProduct: true,
    // Flag to indicate this is a pseudo product
    // Preserve parent product reference
    parentProductId: parentProduct._id?.toString() || parentProduct.id
  };
  return pseudoProduct;
}
async function getProductByBarcode(storeId, barcode) {
  const trimmedBarcode = barcode.trim();
  const cacheKey = getBarcodeCacheKey(storeId, trimmedBarcode);
  const cached = await import_redis.cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const Product = await (0, import_productModel.getProductModelForStore)(storeId);
  const scaleBarcodeResult = await (0, import_scaleBarcode.findProductByScaleBarcode)(
    Product,
    storeId,
    trimmedBarcode
  );
  if (scaleBarcodeResult) {
    const { product: product2, weight } = scaleBarcodeResult;
    const scaleProduct = {
      ...product2,
      _id: product2._id || product2.id,
      id: product2._id?.toString() || product2.id,
      // Store the extracted weight for quantity calculation (in kg for pricing)
      extractedWeight: weight / 1e3,
      // Weight in kg (for quantity calculation)
      extractedWeightGrams: weight,
      // Weight in grams (for reference)
      isScaleBarcodeProduct: true
      // Flag to indicate this came from scale barcode
      // Keep original price (price per kg) - POS will calculate total as price * quantity
      // Quantity will be set to extractedWeight (in kg)
    };
    await import_redis.cache.set(cacheKey, scaleProduct, 3600);
    return scaleProduct;
  }
  const product = await Product.findOne({
    storeId: storeId.toLowerCase(),
    barcode: trimmedBarcode,
    status: "active"
  }).lean();
  if (product) {
    await import_redis.cache.set(cacheKey, product, 3600);
    return product;
  }
  const productWithUnit = await Product.findOne({
    storeId: storeId.toLowerCase(),
    "units.barcode": trimmedBarcode,
    status: "active"
  }).lean();
  if (productWithUnit) {
    const isParentProduct = !productWithUnit.parentProductId || productWithUnit.parentProductId === null || productWithUnit.parentProductId === "";
    if (isParentProduct) {
      const parentId = productWithUnit._id?.toString() || productWithUnit.id;
      const childProduct = await Product.findOne({
        storeId: storeId.toLowerCase(),
        parentProductId: parentId,
        barcode: trimmedBarcode,
        status: "active"
      }).lean();
      if (childProduct) {
        await import_redis.cache.set(cacheKey, childProduct, 3600);
        return childProduct;
      }
      const anyChildProduct = await Product.findOne({
        storeId: storeId.toLowerCase(),
        parentProductId: parentId,
        status: "active"
      }).lean();
      if (anyChildProduct) {
        await import_redis.cache.set(cacheKey, anyChildProduct, 3600);
        return anyChildProduct;
      }
      const matchedUnit = productWithUnit.units?.find(
        (u) => u.barcode && u.barcode.trim().toLowerCase() === trimmedBarcode.toLowerCase()
      );
      if (matchedUnit) {
        const pseudoProduct = createPseudoProductFromUnit(
          productWithUnit,
          matchedUnit,
          trimmedBarcode
        );
        await import_redis.cache.set(cacheKey, pseudoProduct, 3600);
        return pseudoProduct;
      }
      await import_redis.cache.set(cacheKey, productWithUnit, 3600);
      return productWithUnit;
    } else {
      await import_redis.cache.set(cacheKey, productWithUnit, 3600);
      return productWithUnit;
    }
  }
  return null;
}
async function invalidateProductCache(storeId, barcode) {
  const cacheKey = getBarcodeCacheKey(storeId, barcode.trim());
  await import_redis.cache.del(cacheKey);
}
async function invalidateAllProductBarcodeCaches(storeId, product) {
  const barcodesToInvalidate = [];
  if (product.barcode && product.barcode.trim()) {
    barcodesToInvalidate.push(product.barcode.trim());
  }
  if (product.units && Array.isArray(product.units)) {
    product.units.forEach((unit) => {
      if (unit.barcode && unit.barcode.trim()) {
        barcodesToInvalidate.push(unit.barcode.trim());
      }
    });
  }
  await Promise.all(
    barcodesToInvalidate.map((barcode) => invalidateProductCache(storeId, barcode))
  );
}
async function invalidateStoreProductCache(storeId) {
  const pattern = `product:${storeId}:*`;
  await import_redis.cache.delPattern(pattern);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createPseudoProductFromUnit,
  getProductByBarcode,
  invalidateAllProductBarcodeCaches,
  invalidateProductCache,
  invalidateStoreProductCache
});
