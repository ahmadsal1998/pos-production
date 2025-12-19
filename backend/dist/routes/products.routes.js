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
var products_routes_exports = {};
__export(products_routes_exports, {
  default: () => products_routes_default
});
module.exports = __toCommonJS(products_routes_exports);
var import_express = require("express");
var import_products = require("../controllers/products.controller");
var import_auth = require("../middleware/auth.middleware");
var import_storeIsolation = require("../middleware/storeIsolation.middleware");
const router = (0, import_express.Router)();
router.use((req, res, next) => {
  if (req.path.includes("barcode") || req.originalUrl.includes("barcode")) {
    console.log("[Products Router] Incoming request:", {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      url: req.url
    });
  }
  next();
});
router.use(import_auth.authenticate);
router.use(import_storeIsolation.requireStoreAccess);
router.get("/", import_products.getProducts);
router.get("/metrics", import_products.getProductMetrics);
router.get(/^\/barcode\/(.+)$/, async (req, res, next) => {
  const match = req.path.match(/^\/barcode\/(.+)$/);
  if (match) {
    req.params.barcode = match[1];
  }
  console.log("[Products Router] \u2713\u2713\u2713\u2713\u2713 BARCODE ROUTE MATCHED (REGEX) \u2713\u2713\u2713\u2713\u2713");
  console.log("[Products Router] Method:", req.method);
  console.log("[Products Router] Path:", req.path);
  console.log("[Products Router] OriginalUrl:", req.originalUrl);
  console.log("[Products Router] BaseUrl:", req.baseUrl);
  console.log("[Products Router] Url:", req.url);
  console.log("[Products Router] Barcode param:", req.params.barcode);
  console.log("[Products Router] All params:", req.params);
  next();
}, import_products.getProductByBarcode);
router.get("/barcode/:barcode", async (req, res, next) => {
  console.log("[Products Router] \u2713\u2713\u2713 Barcode route MATCHED (STRING) \u2713\u2713\u2713");
  console.log("[Products Router] Method:", req.method);
  console.log("[Products Router] Path:", req.path);
  console.log("[Products Router] OriginalUrl:", req.originalUrl);
  console.log("[Products Router] BaseUrl:", req.baseUrl);
  console.log("[Products Router] Url:", req.url);
  console.log("[Products Router] Barcode param:", req.params.barcode);
  console.log("[Products Router] All params:", req.params);
  next();
}, import_products.getProductByBarcode);
router.post("/", import_products.validateCreateProduct, import_products.createProduct);
router.post("/import", import_products.upload.single("file"), import_products.importProducts);
router.get("/:id", (req, res, next) => {
  if (req.params.id && req.params.id.includes("barcode") || req.path.includes("barcode")) {
    console.error("[Products Router] \u26A0\uFE0F\u26A0\uFE0F\u26A0\uFE0F WARNING: /:id route matched a barcode request! \u26A0\uFE0F\u26A0\uFE0F\u26A0\uFE0F");
    console.error("[Products Router] This means /barcode/:barcode route was NOT matched first");
    console.error("[Products Router] ID param:", req.params.id);
    console.error("[Products Router] Path:", req.path);
    console.error("[Products Router] OriginalUrl:", req.originalUrl);
  }
  next();
}, import_products.getProduct);
router.put("/:id", import_products.updateProduct);
router.delete("/:id", import_products.deleteProduct);
var products_routes_default = router;
