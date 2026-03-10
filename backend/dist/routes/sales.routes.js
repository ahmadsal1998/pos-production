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
var import_salesReports = require("../controllers/salesReports.controller");
var import_auth = require("../middleware/auth.middleware");
var import_storeIsolation = require("../middleware/storeIsolation.middleware");
const router = (0, import_express.Router)();
router.get("/public/invoice", import_sales.getPublicInvoice);
router.use(import_auth.authenticate);
router.use(import_storeIsolation.requireStoreAccess);
router.get("/reports/sales-by-period", import_salesReports.getSalesByPeriod);
router.get("/reports/sales-by-product", import_salesReports.getSalesByProduct);
router.get("/reports/sales-by-category", import_salesReports.getSalesByCategory);
router.get("/reports/sales-by-payment-method", import_salesReports.getSalesByPaymentMethod);
router.get("/reports/sales-by-user", import_salesReports.getSalesByUser);
router.get("/reports/profit-by-period", import_salesReports.getProfitByPeriod);
router.get("/reports/profit-by-product", import_salesReports.getProfitByProduct);
router.get("/reports/top-customers", import_salesReports.getTopCustomers);
router.get("/reports/customer-debt", import_salesReports.getCustomerDebtReport);
router.get("/reports/customer-statement", import_salesReports.getCustomerStatement);
router.get("/reports/best-selling-products", import_salesReports.getBestSellingProducts);
router.get("/reports/least-selling-products", import_salesReports.getLeastSellingProducts);
router.get("/reports/products-not-sold", import_salesReports.getProductsNotSold);
router.get("/reports/current-stock", import_salesReports.getCurrentStockReport);
router.get("/reports/low-stock", import_salesReports.getLowStockReport);
router.get("/reports/stock-movement", import_salesReports.getStockMovementReport);
router.get("/reports/daily-cash", import_salesReports.getDailyCashReport);
router.get("/reports/discounts", import_salesReports.getDiscountReport);
router.get("/reports/returns", import_salesReports.getReturnsReport);
router.get("/current-invoice-number", import_sales.getCurrentInvoiceNumber);
router.get("/next-invoice-number", import_sales.getNextInvoiceNumber);
router.post("/simple", import_sales.createSimpleSale);
router.post("/", import_sales.createSale);
router.post("/return", import_sales.processReturn);
router.get("/summary", import_sales.getSalesSummary);
router.get("/", import_sales.getSales);
router.get("/:id", import_sales.getSale);
router.put("/:id", import_sales.updateSale);
router.delete("/:id", import_sales.deleteSale);
var sales_routes_default = router;
