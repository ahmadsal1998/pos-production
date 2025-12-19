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
var storeIsolation_middleware_exports = {};
__export(storeIsolation_middleware_exports, {
  requireStoreAccess: () => requireStoreAccess,
  sanitizeStoreId: () => sanitizeStoreId,
  validateStoreAccess: () => validateStoreAccess
});
module.exports = __toCommonJS(storeIsolation_middleware_exports);
const requireStoreAccess = (req, res, next) => {
  const isBarcodeRoute = req.path.includes("/barcode") || req.originalUrl.includes("/barcode");
  if (isBarcodeRoute) {
    console.log("[Store Isolation] \u{1F50D} BARCODE ROUTE - Store access check:", {
      path: req.path,
      role: req.user?.role,
      storeId: req.user?.storeId
    });
  }
  const requesterRole = req.user?.role;
  const requesterStoreId = req.user?.storeId;
  if (requesterRole === "Admin") {
    if (isBarcodeRoute) {
      console.log("[Store Isolation] \u2705 BARCODE ROUTE - Admin user, bypassing store restrictions");
    }
    return next();
  }
  if (!requesterStoreId) {
    if (isBarcodeRoute) {
      console.error("[Store Isolation] \u274C BARCODE ROUTE - Missing storeId");
    }
    res.status(403).json({
      success: false,
      message: "Access denied. Store ID is required. Please ensure your account is associated with a store."
    });
    return;
  }
  req.user = {
    ...req.user,
    storeId: requesterStoreId.toLowerCase()
  };
  if (isBarcodeRoute) {
    console.log("[Store Isolation] \u2705 BARCODE ROUTE - Store access granted, calling next()");
  }
  next();
};
const sanitizeStoreId = (field = "storeId", location = "body") => {
  return (req, res, next) => {
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;
    if (requesterRole === "Admin") {
      return next();
    }
    if (!requesterStoreId) {
      res.status(403).json({
        success: false,
        message: "Access denied. Store ID is required for non-admin users."
      });
      return;
    }
    const source = location === "body" ? req.body : location === "params" ? req.params : req.query;
    if (source && source[field]) {
      console.warn(`[SECURITY] storeId provided in ${location}.${field} - removing for user ${req.user?.userId}`);
      delete source[field];
    }
    next();
  };
};
const validateStoreAccess = sanitizeStoreId;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  requireStoreAccess,
  sanitizeStoreId,
  validateStoreAccess
});
