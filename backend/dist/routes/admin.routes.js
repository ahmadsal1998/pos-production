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
var admin_routes_exports = {};
__export(admin_routes_exports, {
  default: () => admin_routes_default
});
module.exports = __toCommonJS(admin_routes_exports);
var import_express = require("express");
var import_admin = require("../controllers/admin.controller");
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
router.use(isAdmin);
router.get("/stores", import_admin.getStores);
router.get("/stores/:id", import_admin.getStore);
router.post("/stores", import_admin.validateCreateStore, import_admin.createStore);
router.put("/stores/:id", import_admin.validateUpdateStore, import_admin.updateStore);
router.delete("/stores/:id", import_admin.deleteStore);
router.post("/stores/:id/renew-subscription", import_admin.validateRenewSubscription, import_admin.renewSubscription);
router.patch("/stores/:id/status", import_admin.toggleStoreStatus);
router.get("/settings", import_admin.getSettings);
router.get("/settings/:key", import_admin.getSetting);
router.put("/settings/:key", import_admin.validateUpdateSetting, import_admin.updateSetting);
var admin_routes_default = router;
