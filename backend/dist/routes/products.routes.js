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
var import_logger = require("../utils/logger");
const router = (0, import_express.Router)();
router.use((req, res, next) => {
  if (req.path.includes("barcode") || req.originalUrl.includes("barcode")) {
    import_logger.log.debug("[Products Router] Incoming request", {
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
  import_logger.log.debug("[Products Router] BARCODE ROUTE MATCHED (REGEX)", {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    url: req.url,
    barcode: req.params.barcode,
    params: req.params
  });
  next();
}, import_products.getProductByBarcode);
router.get("/barcode/:barcode", async (req, res, next) => {
  import_logger.log.debug("[Products Router] Barcode route MATCHED (STRING)", {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    url: req.url,
    barcode: req.params.barcode,
    params: req.params
  });
  next();
}, import_products.getProductByBarcode);
router.post("/", import_products.validateCreateProduct, import_products.createProduct);
router.post("/import", import_products.upload.single("file"), import_products.importProducts);
router.get("/:id", (req, res, next) => {
  if (req.params.id && req.params.id.includes("barcode") || req.path.includes("barcode")) {
    import_logger.log.error("[Products Router] WARNING: /:id route matched a barcode request!", {
      message: "This means /barcode/:barcode route was NOT matched first",
      idParam: req.params.id,
      path: req.path,
      originalUrl: req.originalUrl
    });
  }
  next();
}, import_products.getProduct);
router.put("/:id", import_products.updateProduct);
router.delete("/:id", import_products.deleteProduct);
var products_routes_default = router;
