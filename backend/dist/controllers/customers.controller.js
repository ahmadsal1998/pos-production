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
var customers_controller_exports = {};
__export(customers_controller_exports, {
  createCustomer: () => createCustomer,
  createCustomerPayment: () => createCustomerPayment,
  getCustomerById: () => getCustomerById,
  getCustomerPayments: () => getCustomerPayments,
  getCustomers: () => getCustomers,
  validateCreateCustomer: () => validateCreateCustomer,
  validateCreateCustomerPayment: () => validateCreateCustomerPayment
});
module.exports = __toCommonJS(customers_controller_exports);
var import_express_validator = require("express-validator");
var import_error = require("../middleware/error.middleware");
var import_customerModel = require("../utils/customerModel");
var import_customerPaymentModel = require("../utils/customerPaymentModel");
var import_userModel = require("../utils/userModel");
const validateCreateCustomer = [
  (0, import_express_validator.body)("name").optional({ nullable: true }).trim().isLength({ max: 200 }).withMessage("Customer name cannot exceed 200 characters"),
  (0, import_express_validator.body)("phone").trim().notEmpty().withMessage("Phone number is required").isLength({ max: 20 }).withMessage("Phone number cannot exceed 20 characters"),
  (0, import_express_validator.body)("address").optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage("Address cannot exceed 500 characters"),
  (0, import_express_validator.body)("previousBalance").optional({ nullable: true }).isFloat({ min: 0 }).withMessage("Previous balance must be a non-negative number")
];
const createCustomer = (0, import_error.asyncHandler)(async (req, res) => {
  const errors = (0, import_express_validator.validationResult)(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  const { name, phone, address, previousBalance = 0 } = req.body;
  let storeId = req.user?.storeId || null;
  if (!storeId && req.user?.userId && req.user.userId !== "admin") {
    try {
      const user = await (0, import_userModel.findUserByIdAcrossStores)(req.user.userId, req.user.storeId || void 0);
      if (user && user.storeId) {
        storeId = user.storeId;
      }
    } catch (error) {
      console.error("Error fetching user:", error.message);
    }
  }
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Customer = await (0, import_customerModel.getCustomerModelForStore)(storeId);
    const existingCustomer = await Customer.findOne({
      phone: phone.trim()
    });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Customer with this phone number already exists"
      });
    }
    const customerName = name?.trim() || phone.trim();
    const customer = await Customer.create({
      name: customerName,
      phone: phone.trim(),
      address: address?.trim() || void 0,
      previousBalance: previousBalance || 0
    });
    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: {
        customer: {
          id: customer._id.toString(),
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          previousBalance: customer.previousBalance,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt
        }
      }
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    if (error.name === "ValidationError") {
      const errorMessages = Object.values(error.errors || {}).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: errorMessages.join(", ") || "Validation error"
      });
    }
    if (error.code === 11e3) {
      return res.status(400).json({
        success: false,
        message: "Customer with this phone number already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create customer. Please try again."
    });
  }
});
const getCustomers = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user.",
      data: {
        customers: []
      }
    });
  }
  try {
    const Customer = await (0, import_customerModel.getCustomerModelForStore)(storeId);
    const customers = await Customer.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Customers fetched successfully",
      data: {
        customers: customers.map((customer) => ({
          id: customer._id.toString(),
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          previousBalance: customer.previousBalance,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt
        }))
      }
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch customers. Please try again.",
      data: {
        customers: []
      }
    });
  }
});
const getCustomerById = (0, import_error.asyncHandler)(async (req, res) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Customer = await (0, import_customerModel.getCustomerModelForStore)(storeId);
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }
    res.status(200).json({
      success: true,
      message: "Customer fetched successfully",
      data: {
        customer: {
          id: customer._id.toString(),
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          previousBalance: customer.previousBalance,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt
        }
      }
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch customer. Please try again."
    });
  }
});
const validateCreateCustomerPayment = [
  (0, import_express_validator.body)("customerId").trim().notEmpty().withMessage("Customer ID is required"),
  (0, import_express_validator.body)("amount").isFloat({ min: 0.01 }).withMessage("Payment amount must be greater than 0"),
  (0, import_express_validator.body)("method").isIn(["Cash", "Bank Transfer", "Cheque"]).withMessage("Payment method must be Cash, Bank Transfer, or Cheque"),
  (0, import_express_validator.body)("date").optional().isISO8601().withMessage("Date must be a valid ISO 8601 date"),
  (0, import_express_validator.body)("invoiceId").optional().trim(),
  (0, import_express_validator.body)("notes").optional().trim().isLength({ max: 1e3 }).withMessage("Notes cannot exceed 1000 characters")
];
const createCustomerPayment = (0, import_error.asyncHandler)(async (req, res) => {
  const errors = (0, import_express_validator.validationResult)(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  const { customerId, amount, method, date, invoiceId, notes } = req.body;
  let storeId = req.user?.storeId || null;
  if (!storeId && req.user?.userId && req.user.userId !== "admin") {
    try {
      const user = await (0, import_userModel.findUserByIdAcrossStores)(req.user.userId, req.user.storeId || void 0);
      if (user && user.storeId) {
        storeId = user.storeId;
      }
    } catch (error) {
      console.error("Error fetching user:", error.message);
    }
  }
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Customer = await (0, import_customerModel.getCustomerModelForStore)(storeId);
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }
    const CustomerPayment = await (0, import_customerPaymentModel.getCustomerPaymentModelForStore)(storeId);
    const payment = await CustomerPayment.create({
      customerId: customerId.trim(),
      storeId,
      date: date ? new Date(date) : /* @__PURE__ */ new Date(),
      amount: parseFloat(amount),
      method,
      invoiceId: invoiceId?.trim() || null,
      notes: notes?.trim() || null
    });
    res.status(201).json({
      success: true,
      message: "Customer payment created successfully",
      data: {
        payment: {
          id: payment._id.toString(),
          customerId: payment.customerId,
          date: payment.date,
          amount: payment.amount,
          method: payment.method,
          invoiceId: payment.invoiceId,
          notes: payment.notes,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt
        }
      }
    });
  } catch (error) {
    console.error("Error creating customer payment:", error);
    if (error.name === "ValidationError") {
      const errorMessages = Object.values(error.errors || {}).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: errorMessages.join(", ") || "Validation error"
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create customer payment. Please try again."
    });
  }
});
const getCustomerPayments = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  const { customerId } = req.query;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user.",
      data: {
        payments: []
      }
    });
  }
  try {
    const CustomerPayment = await (0, import_customerPaymentModel.getCustomerPaymentModelForStore)(storeId);
    const query = {};
    if (customerId && typeof customerId === "string") {
      query.customerId = customerId.trim();
    }
    const payments = await CustomerPayment.find(query).sort({ date: -1, createdAt: -1 }).lean();
    res.status(200).json({
      success: true,
      message: "Customer payments fetched successfully",
      data: {
        payments: payments.map((payment) => ({
          id: payment._id.toString(),
          customerId: payment.customerId,
          date: payment.date,
          amount: payment.amount,
          method: payment.method,
          invoiceId: payment.invoiceId,
          notes: payment.notes,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt
        }))
      }
    });
  } catch (error) {
    console.error("Error fetching customer payments:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch customer payments. Please try again.",
      data: {
        payments: []
      }
    });
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createCustomer,
  createCustomerPayment,
  getCustomerById,
  getCustomerPayments,
  getCustomers,
  validateCreateCustomer,
  validateCreateCustomerPayment
});
