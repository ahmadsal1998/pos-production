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
  validateStoreAccess: () => validateStoreAccess
});
module.exports = __toCommonJS(storeIsolation_middleware_exports);
const requireStoreAccess = (req, res, next) => {
  const requesterRole = req.user?.role;
  const requesterStoreId = req.user?.storeId;
  if (requesterRole === "Admin") {
    return next();
  }
  if (!requesterStoreId) {
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
  next();
};
const validateStoreAccess = (field = "storeId", location = "body") => {
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
    const providedStoreId = source?.[field];
    if (providedStoreId && providedStoreId.toLowerCase() !== requesterStoreId.toLowerCase()) {
      res.status(403).json({
        success: false,
        message: "Access denied. You can only access data from your own store."
      });
      return;
    }
    if (!providedStoreId && location === "body") {
      req.body[field] = requesterStoreId.toLowerCase();
    }
    next();
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  requireStoreAccess,
  validateStoreAccess
});
