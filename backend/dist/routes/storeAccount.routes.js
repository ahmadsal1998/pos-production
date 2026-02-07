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
var storeAccount_routes_exports = {};
__export(storeAccount_routes_exports, {
  default: () => storeAccount_routes_default
});
module.exports = __toCommonJS(storeAccount_routes_exports);
var import_express = require("express");
var import_storeAccount = require("../controllers/storeAccount.controller");
var import_auth = require("../middleware/auth.middleware");
const router = (0, import_express.Router)();
router.use(import_auth.authenticate);
const isAdmin = (req, res, next) => {
  if (req.user?.userId === "admin" && req.user?.role === "Admin") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied. Admin privileges required."
  });
};
router.get("/", isAdmin, import_storeAccount.getStoreAccounts);
router.get("/:id", import_storeAccount.getStoreAccount);
router.put("/:storeId/threshold", isAdmin, import_storeAccount.validateUpdateThreshold, import_storeAccount.updateStoreAccountThreshold);
router.post("/:storeId/payment", isAdmin, import_storeAccount.validateMakePayment, import_storeAccount.makePaymentToStore);
router.patch("/:storeId/status", isAdmin, import_storeAccount.toggleStoreAccountStatus);
var storeAccount_routes_default = router;
