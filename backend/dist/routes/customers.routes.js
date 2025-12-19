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
var customers_routes_exports = {};
__export(customers_routes_exports, {
  default: () => customers_routes_default
});
module.exports = __toCommonJS(customers_routes_exports);
var import_express = require("express");
var import_customers = require("../controllers/customers.controller");
var import_auth = require("../middleware/auth.middleware");
var import_storeIsolation = require("../middleware/storeIsolation.middleware");
const router = (0, import_express.Router)();
router.use(import_auth.authenticate);
router.use(import_storeIsolation.requireStoreAccess);
router.get("/", import_customers.getCustomers);
router.get("/:id", import_customers.getCustomerById);
router.post("/", import_customers.validateCreateCustomer, import_customers.createCustomer);
router.put("/:id", import_customers.validateUpdateCustomer, import_customers.updateCustomer);
router.delete("/:id", import_customers.deleteCustomer);
router.get("/payments/list", import_customers.getCustomerPayments);
router.post("/payments", import_customers.validateCreateCustomerPayment, import_customers.createCustomerPayment);
var customers_routes_default = router;
