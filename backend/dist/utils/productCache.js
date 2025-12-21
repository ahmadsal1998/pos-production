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
  getProductByBarcode: () => getProductByBarcode,
  invalidateAllProductBarcodeCaches: () => invalidateAllProductBarcodeCaches,
  invalidateProductCache: () => invalidateProductCache,
  invalidateStoreProductCache: () => invalidateStoreProductCache
});
module.exports = __toCommonJS(productCache_exports);
var import_redis = require("./redis");
var import_productModel = require("./productModel");
function getBarcodeCacheKey(storeId, barcode) {
  return `product:${storeId}:${barcode}`;
}
async function getProductByBarcode(storeId, barcode) {
  const trimmedBarcode = barcode.trim();
  const cacheKey = getBarcodeCacheKey(storeId, trimmedBarcode);
  const cached = await import_redis.cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const Product = await (0, import_productModel.getProductModelForStore)(storeId);
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
    await import_redis.cache.set(cacheKey, productWithUnit, 3600);
    return productWithUnit;
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
  getProductByBarcode,
  invalidateAllProductBarcodeCaches,
  invalidateProductCache,
  invalidateStoreProductCache
});
