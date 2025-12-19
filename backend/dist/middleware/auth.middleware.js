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
var auth_middleware_exports = {};
__export(auth_middleware_exports, {
  authenticate: () => authenticate,
  authorize: () => authorize
});
module.exports = __toCommonJS(auth_middleware_exports);
var import_jwt = require("../utils/jwt");
var import_subscriptionManager = require("../utils/subscriptionManager");
const authenticate = async (req, res, next) => {
  try {
    const isBarcodeRoute = req.path.includes("/barcode") || req.originalUrl.includes("/barcode");
    if (isBarcodeRoute) {
      console.log("[Auth Middleware] \u{1F50D} BARCODE ROUTE - Authentication check:", {
        path: req.path,
        originalUrl: req.originalUrl,
        method: req.method,
        hasAuthHeader: !!req.headers.authorization,
        authHeaderPrefix: req.headers.authorization?.substring(0, 20) || "none"
      });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (isBarcodeRoute) {
        console.error("[Auth Middleware] \u274C BARCODE ROUTE - Missing or invalid auth header");
      }
      res.status(401).json({
        success: false,
        message: "Authentication required. Please provide a valid token."
      });
      return;
    }
    const token = authHeader.substring(7);
    try {
      const decoded = (0, import_jwt.verifyToken)(token);
      req.user = decoded;
      if (isBarcodeRoute) {
        console.log("[Auth Middleware] \u2705 BARCODE ROUTE - Token verified:", {
          userId: decoded.userId,
          storeId: decoded.storeId,
          role: decoded.role
        });
      }
      if (decoded.storeId && decoded.role !== "Admin") {
        try {
          const subscriptionStatus = await (0, import_subscriptionManager.checkAndUpdateStoreSubscription)(decoded.storeId);
          if (!subscriptionStatus.isActive || subscriptionStatus.subscriptionExpired) {
            if (isBarcodeRoute) {
              console.error("[Auth Middleware] \u274C BARCODE ROUTE - Subscription expired");
            }
            res.status(403).json({
              success: false,
              message: "Your store subscription has expired. Please renew your subscription to regain access.",
              code: "SUBSCRIPTION_EXPIRED",
              subscriptionEndDate: subscriptionStatus.subscriptionEndDate
            });
            return;
          }
        } catch (error) {
          console.error(`Error checking subscription for store ${decoded.storeId}:`, error.message);
        }
      }
      if (isBarcodeRoute) {
        console.log("[Auth Middleware] \u2705 BARCODE ROUTE - Authentication passed, calling next()");
      }
      next();
    } catch (error) {
      const isBarcodeRoute2 = req.path.includes("/barcode") || req.originalUrl.includes("/barcode");
      console.error("[Auth Middleware] Token verification failed:", {
        error: error.message,
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20) + "...",
        jwtSecretSet: !!process.env.JWT_SECRET,
        jwtSecretLength: process.env.JWT_SECRET?.length || 0,
        nodeEnv: process.env.NODE_ENV,
        isBarcodeRoute: isBarcodeRoute2,
        path: req.path
      });
      if (isBarcodeRoute2) {
        console.error("[Auth Middleware] \u274C BARCODE ROUTE - Authentication failed");
      }
      res.status(401).json({
        success: false,
        message: error.message || "Invalid or expired token."
      });
      return;
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication failed."
    });
    return;
  }
};
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required."
      });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions."
      });
      return;
    }
    next();
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  authenticate,
  authorize
});
