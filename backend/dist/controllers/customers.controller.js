"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var customers_controller_exports = {};
__export(customers_controller_exports, {
  createCustomer: () => createCustomer,
  createCustomerPayment: () => createCustomerPayment,
  deleteCustomer: () => deleteCustomer,
  getCustomerAccountsSummary: () => getCustomerAccountsSummary,
  getCustomerById: () => getCustomerById,
  getCustomerPayments: () => getCustomerPayments,
  getCustomers: () => getCustomers,
  updateCustomer: () => updateCustomer,
  validateCreateCustomer: () => validateCreateCustomer,
  validateCreateCustomerPayment: () => validateCreateCustomerPayment,
  validateUpdateCustomer: () => validateUpdateCustomer
});
module.exports = __toCommonJS(customers_controller_exports);
var import_express_validator = require("express-validator");
var import_error = require("../middleware/error.middleware");
var import_customerPaymentModel = require("../utils/customerPaymentModel");
var import_customerModel = require("../utils/customerModel");
var import_saleModel = require("../utils/saleModel");
var import_User = __toESM(require("../models/User"));
var import_logger = require("../utils/logger");
var import_pagination = require("../types/pagination");
const validateCreateCustomer = [
  (0, import_express_validator.body)("name").optional({ nullable: true }).trim().isLength({ max: 200 }).withMessage("Customer name cannot exceed 200 characters"),
  (0, import_express_validator.body)("phone").trim().notEmpty().withMessage("Phone number is required").isLength({ max: 20 }).withMessage("Phone number cannot exceed 20 characters"),
  (0, import_express_validator.body)("address").optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage("Address cannot exceed 500 characters"),
  (0, import_express_validator.body)("previousBalance").optional({ nullable: true }).isFloat().withMessage("Previous balance must be a valid number")
];
const createCustomer = (0, import_error.asyncHandler)(async (req, res, next) => {
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
      const user = await import_User.default.findById(req.user.userId);
      if (user && user.storeId) {
        storeId = user.storeId;
      }
    } catch (error) {
      import_logger.log.error("Error fetching user", error);
    }
  }
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const Customer = await (0, import_customerModel.getCustomerModelForStore)(storeId);
    const existingCustomer = await Customer.findOne({
      storeId: normalizedStoreId,
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
      storeId: normalizedStoreId,
      name: customerName,
      phone: phone.trim(),
      address: address?.trim() || void 0,
      previousBalance: previousBalance || 0
    });
    if (previousBalance && previousBalance !== 0) {
      try {
        const CustomerPayment = (0, import_customerPaymentModel.getCustomerPaymentModelForStore)(storeId);
        const isJournalVoucher = previousBalance > 0;
        const paymentAmount = isJournalVoucher ? -Math.abs(previousBalance) : Math.abs(previousBalance);
        const voucherType = isJournalVoucher ? "Journal Voucher" : "Receipt Voucher";
        await CustomerPayment.create({
          customerId: customer._id.toString(),
          storeId: normalizedStoreId,
          date: customer.createdAt,
          // Use customer creation date
          amount: paymentAmount,
          // Negative for Journal Voucher, positive for Receipt Voucher
          method: "Cash",
          // Default method for initial balance
          invoiceId: null,
          notes: `\u0631\u0635\u064A\u062F \u0623\u0648\u0644\u064A - ${isJournalVoucher ? "\u0633\u0646\u062F \u0642\u064A\u062F" : "\u0633\u0646\u062F \u0642\u0628\u0636"}`
        });
      } catch (paymentError) {
        import_logger.log.error("Error creating initial balance payment record", paymentError);
      }
    }
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
    next(error);
  }
});
const getCustomers = (0, import_error.asyncHandler)(async (req, res, next) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user.",
      data: { items: [], pagination: (0, import_pagination.buildPaginationMeta)(1, 50, 0), customers: [] }
    });
  }
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const searchTerm = req.query.search?.trim() || "";
    const lightParam = req.query.light?.toLowerCase();
    const light = lightParam === "true" || lightParam === "1" || lightParam === "yes";
    const maxLimit = light ? import_pagination.MAX_PAGE_SIZE_LIGHT : import_pagination.MAX_PAGE_SIZE;
    const { page, limit, skip } = (0, import_pagination.parsePaginationQuery)(req.query, maxLimit);
    const Customer = await (0, import_customerModel.getCustomerModelForStore)(storeId);
    const queryFilter = { storeId: normalizedStoreId };
    if (searchTerm) {
      const normalizedSearchTerm = searchTerm.replace(/\s+/g, " ").trim();
      const escapedSearchTerm = normalizedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      queryFilter.$or = [
        { name: { $regex: escapedSearchTerm, $options: "i" } },
        { phone: { $regex: escapedSearchTerm, $options: "i" } },
        { address: { $regex: escapedSearchTerm, $options: "i" } }
      ];
    }
    const [customers, total] = await Promise.all([
      Customer.find(queryFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Customer.countDocuments(queryFilter)
    ]);
    const mapCustomer = (c) => ({
      id: c._id.toString(),
      name: c.name,
      phone: c.phone,
      ...light ? {} : { address: c.address, previousBalance: c.previousBalance, createdAt: c.createdAt, updatedAt: c.updatedAt }
    });
    const items = customers.map(mapCustomer);
    const pagination = (0, import_pagination.buildPaginationMeta)(page, limit, total);
    res.status(200).json({
      success: true,
      message: "Customers fetched successfully",
      data: {
        items,
        pagination,
        customers: items
      }
    });
  } catch (error) {
    next(error);
  }
});
const getCustomerById = (0, import_error.asyncHandler)(async (req, res, next) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const Customer = await (0, import_customerModel.getCustomerModelForStore)(storeId);
    const customer = await Customer.findOne({
      _id: id,
      storeId: normalizedStoreId
    });
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
    next(error);
  }
});
const validateUpdateCustomer = [
  (0, import_express_validator.body)("name").optional({ nullable: true }).trim().isLength({ max: 200 }).withMessage("Customer name cannot exceed 200 characters"),
  (0, import_express_validator.body)("phone").optional({ nullable: true }).trim().isLength({ max: 20 }).withMessage("Phone number cannot exceed 20 characters"),
  (0, import_express_validator.body)("address").optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage("Address cannot exceed 500 characters"),
  (0, import_express_validator.body)("previousBalance").optional({ nullable: true }).isFloat().withMessage("Previous balance must be a valid number")
];
const updateCustomer = (0, import_error.asyncHandler)(async (req, res, next) => {
  const errors = (0, import_express_validator.validationResult)(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  const { id } = req.params;
  const { name, phone, address, previousBalance } = req.body;
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const Customer = await (0, import_customerModel.getCustomerModelForStore)(storeId);
    const customer = await Customer.findOne({
      _id: id,
      storeId: normalizedStoreId
    });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }
    if (phone && phone.trim() !== customer.phone) {
      const existingCustomer = await Customer.findOne({
        storeId: normalizedStoreId,
        phone: phone.trim(),
        _id: { $ne: id }
      });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: "Customer with this phone number already exists"
        });
      }
    }
    const updateData = {};
    if (name !== void 0) {
      updateData.name = name?.trim() || phone?.trim() || customer.phone;
    }
    if (phone !== void 0) {
      updateData.phone = phone.trim();
      if (!name && !customer.name) {
        updateData.name = phone.trim();
      }
    }
    if (address !== void 0) {
      updateData.address = address?.trim() || void 0;
    }
    if (previousBalance !== void 0) {
      updateData.previousBalance = previousBalance || 0;
    }
    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: id, storeId: normalizedStoreId },
      updateData,
      { new: true, runValidators: true }
    );
    if (!updatedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }
    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: {
        customer: {
          id: updatedCustomer._id.toString(),
          name: updatedCustomer.name,
          phone: updatedCustomer.phone,
          address: updatedCustomer.address,
          previousBalance: updatedCustomer.previousBalance,
          createdAt: updatedCustomer.createdAt,
          updatedAt: updatedCustomer.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});
const deleteCustomer = (0, import_error.asyncHandler)(async (req, res, next) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const Customer = await (0, import_customerModel.getCustomerModelForStore)(storeId);
    const customer = await Customer.findOne({
      _id: id,
      storeId: normalizedStoreId
    });
    if (!customer) {
      return res.status(200).json({
        success: true,
        message: "Customer already deleted or not found"
      });
    }
    await Customer.deleteOne({ _id: id, storeId: normalizedStoreId });
    res.status(200).json({
      success: true,
      message: "Customer deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});
const validateCreateCustomerPayment = [
  (0, import_express_validator.body)("customerId").trim().notEmpty().withMessage("Customer ID is required"),
  (0, import_express_validator.body)("amount").isFloat().custom((value) => {
    if (value === 0) {
      throw new Error("Payment amount cannot be zero");
    }
    return true;
  }).withMessage("Payment amount cannot be zero"),
  (0, import_express_validator.body)("method").isIn(["Cash", "Bank Transfer", "Cheque"]).withMessage("Payment method must be Cash, Bank Transfer, or Cheque"),
  (0, import_express_validator.body)("date").optional().isISO8601().withMessage("Date must be a valid ISO 8601 date"),
  (0, import_express_validator.body)("invoiceId").optional().trim(),
  (0, import_express_validator.body)("notes").optional().trim().isLength({ max: 1e3 }).withMessage("Notes cannot exceed 1000 characters")
];
const createCustomerPayment = (0, import_error.asyncHandler)(async (req, res, next) => {
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
      const user = await import_User.default.findById(req.user.userId);
      if (user && user.storeId) {
        storeId = user.storeId;
      }
    } catch (error) {
      import_logger.log.error("Error fetching user", error);
    }
  }
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const Customer = await (0, import_customerModel.getCustomerModelForStore)(storeId);
    const customer = await Customer.findOne({
      _id: customerId,
      storeId: normalizedStoreId
    });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }
    const CustomerPayment = (0, import_customerPaymentModel.getCustomerPaymentModelForStore)(storeId);
    const payment = await CustomerPayment.create({
      customerId: customerId.trim(),
      storeId: normalizedStoreId,
      // Use normalized storeId for consistency
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
    next(error);
  }
});
const getCustomerAccountsSummary = (0, import_error.asyncHandler)(async (req, res, next) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required.",
      data: { summaries: [] }
    });
  }
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const Customer = await (0, import_customerModel.getCustomerModelForStore)(storeId);
    const Sale = await (0, import_saleModel.getSaleModelForStore)(storeId);
    const CustomerPayment = (0, import_customerPaymentModel.getCustomerPaymentModelForStore)(storeId);
    const [customers, salesByCustomer, paymentsByCustomer] = await Promise.all([
      Customer.find({ storeId: normalizedStoreId }).select("_id name phone address previousBalance").lean(),
      Sale.aggregate([
        { $match: { storeId: normalizedStoreId } },
        {
          $group: {
            _id: "$customerId",
            totalRemainingFromSales: { $sum: "$remainingAmount" },
            totalPaidAtSale: { $sum: "$paidAmount" },
            totalPurchases: { $sum: "$total" }
          }
        }
      ]),
      CustomerPayment.aggregate([
        { $match: { storeId: normalizedStoreId } },
        {
          $group: {
            _id: "$customerId",
            receiptTotal: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
            journalTotal: { $sum: { $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0] } },
            receiptExclInitial: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$amount", 0] },
                      { $not: { $regexMatch: { input: { $ifNull: ["$notes", ""] }, regex: "\u0631\u0635\u064A\u062F \u0623\u0648\u0644\u064A" } } }
                    ]
                  },
                  "$amount",
                  0
                ]
              }
            },
            journalExclInitial: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ["$amount", 0] },
                      { $not: { $regexMatch: { input: { $ifNull: ["$notes", ""] }, regex: "\u0631\u0635\u064A\u062F \u0623\u0648\u0644\u064A" } } }
                    ]
                  },
                  { $abs: "$amount" },
                  0
                ]
              }
            },
            lastPaymentDate: { $max: "$date" }
          }
        }
      ])
    ]);
    const salesMap = /* @__PURE__ */ new Map();
    salesByCustomer.forEach((row) => {
      salesMap.set(row._id || null, {
        totalRemainingFromSales: row.totalRemainingFromSales ?? 0,
        totalPaidAtSale: row.totalPaidAtSale ?? 0,
        totalPurchases: row.totalPurchases ?? 0
      });
    });
    const paymentsMap = /* @__PURE__ */ new Map();
    paymentsByCustomer.forEach((row) => {
      paymentsMap.set(row._id || null, {
        receiptTotal: row.receiptTotal ?? 0,
        journalTotal: row.journalTotal ?? 0,
        receiptExclInitial: row.receiptExclInitial ?? 0,
        journalExclInitial: row.journalExclInitial ?? 0,
        lastPaymentDate: row.lastPaymentDate ?? null
      });
    });
    const summaries = customers.map((c) => {
      const id = c._id.toString();
      const sales = salesMap.get(id) || { totalRemainingFromSales: 0, totalPaidAtSale: 0, totalPurchases: 0 };
      const pay = paymentsMap.get(id) || { receiptTotal: 0, journalTotal: 0, receiptExclInitial: 0, journalExclInitial: 0, lastPaymentDate: null };
      const previousBalance = Number(c.previousBalance) || 0;
      const totalSales = sales.totalPurchases + pay.journalTotal;
      const totalPaid = sales.totalPaidAtSale + pay.receiptTotal;
      const balance = -previousBalance + pay.receiptExclInitial - pay.journalExclInitial - sales.totalRemainingFromSales;
      return {
        customerId: id,
        customerName: c.name || "",
        address: c.address,
        totalSales,
        totalPaid,
        balance,
        lastPaymentDate: pay.lastPaymentDate ? new Date(pay.lastPaymentDate).toISOString() : null
      };
    });
    res.status(200).json({
      success: true,
      message: "Customer account summaries fetched successfully",
      data: { summaries }
    });
  } catch (error) {
    next(error);
  }
});
const getCustomerPayments = (0, import_error.asyncHandler)(async (req, res, next) => {
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
    const normalizedStoreId = storeId.toLowerCase().trim();
    const CustomerPayment = (0, import_customerPaymentModel.getCustomerPaymentModelForStore)(storeId);
    const query = {
      storeId: normalizedStoreId
      // Required: filter by storeId
    };
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
    next(error);
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createCustomer,
  createCustomerPayment,
  deleteCustomer,
  getCustomerAccountsSummary,
  getCustomerById,
  getCustomerPayments,
  getCustomers,
  updateCustomer,
  validateCreateCustomer,
  validateCreateCustomerPayment,
  validateUpdateCustomer
});
