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
var sales_routes_exports = {};
__export(sales_routes_exports, {
  default: () => sales_routes_default
});
module.exports = __toCommonJS(sales_routes_exports);
var import_express = require("express");
var import_sales = require("../controllers/sales.controller");
var import_auth = require("../middleware/auth.middleware");
var import_storeIsolation = require("../middleware/storeIsolation.middleware");
const router = (0, import_express.Router)();
router.get("/public/invoice", import_sales.getPublicInvoice);
router.use(import_auth.authenticate);
router.use(import_storeIsolation.requireStoreAccess);
router.get("/next-invoice-number", import_sales.getNextInvoiceNumber);
router.post("/", import_sales.createSale);
router.post("/return", import_sales.processReturn);
router.get("/summary", import_sales.getSalesSummary);
router.get("/", import_sales.getSales);
router.get("/:id", import_sales.getSale);
router.put("/:id", import_sales.updateSale);
router.delete("/:id", import_sales.deleteSale);
var sales_routes_default = router;
