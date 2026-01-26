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
var points_routes_exports = {};
__export(points_routes_exports, {
  default: () => points_routes_default
});
module.exports = __toCommonJS(points_routes_exports);
var import_express = require("express");
var import_points = require("../controllers/points.controller");
var import_auth = require("../middleware/auth.middleware");
var import_storeIsolation = require("../middleware/storeIsolation.middleware");
const router = (0, import_express.Router)();
router.use(import_auth.authenticate);
router.use(import_storeIsolation.requireStoreAccess);
router.post("/add", import_points.validateAddPoints, import_points.addPointsAfterSale);
router.get("/customer/history", import_points.getCustomerPointsHistory);
router.get("/customer", import_points.getCustomerPoints);
router.get("/customer/:customerId/history", import_points.getCustomerPointsHistory);
router.get("/customer/:customerId", import_points.getCustomerPoints);
router.post("/pay", import_points.validatePayWithPoints, import_points.payWithPoints);
var points_routes_default = router;
