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
var storeAccount_controller_exports = {};
__export(storeAccount_controller_exports, {
  getStoreAccount: () => getStoreAccount,
  getStoreAccounts: () => getStoreAccounts,
  makePaymentToStore: () => makePaymentToStore,
  toggleStoreAccountStatus: () => toggleStoreAccountStatus,
  updateStoreAccountThreshold: () => updateStoreAccountThreshold,
  validateMakePayment: () => validateMakePayment,
  validateUpdateThreshold: () => validateUpdateThreshold
});
module.exports = __toCommonJS(storeAccount_controller_exports);
var import_express_validator = require("express-validator");
var import_error = require("../middleware/error.middleware");
var import_StoreAccount = __toESM(require("../models/StoreAccount"));
var import_Store = __toESM(require("../models/Store"));
const getStoreAccounts = (0, import_error.asyncHandler)(async (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin role required."
    });
  }
  const accounts = await import_StoreAccount.default.find().sort({ dueBalance: -1 });
  res.status(200).json({
    success: true,
    data: {
      accounts
    }
  });
});
const getStoreAccount = (0, import_error.asyncHandler)(async (req, res) => {
  const userRole = req.user?.role;
  const storeId = req.user?.storeId || null;
  const { id } = req.params;
  const query = {};
  if (userRole !== "Admin") {
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required"
      });
    }
    query.storeId = storeId.toLowerCase();
  } else {
    query.storeId = id.toLowerCase();
  }
  const account = await import_StoreAccount.default.findOne(query);
  if (!account) {
    return res.status(404).json({
      success: false,
      message: "Store account not found"
    });
  }
  res.status(200).json({
    success: true,
    data: {
      account
    }
  });
});
const updateStoreAccountThreshold = (0, import_error.asyncHandler)(async (req, res) => {
  const errors = (0, import_express_validator.validationResult)(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  const userRole = req.user?.role;
  if (userRole !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin role required."
    });
  }
  const { storeId } = req.params;
  const { threshold } = req.body;
  if (!storeId || !threshold || threshold < 0) {
    return res.status(400).json({
      success: false,
      message: "Store ID and valid threshold are required"
    });
  }
  const account = await import_StoreAccount.default.findOne({ storeId: storeId.toLowerCase() });
  if (!account) {
    return res.status(404).json({
      success: false,
      message: "Store account not found"
    });
  }
  account.threshold = threshold;
  if (account.isPaused && account.dueBalance < threshold) {
    account.isPaused = false;
    account.pausedAt = void 0;
    account.pausedReason = void 0;
    await import_Store.default.findOneAndUpdate(
      { storeId: storeId.toLowerCase() },
      { isActive: true }
    );
  }
  await account.save();
  res.status(200).json({
    success: true,
    message: "Store account threshold updated successfully",
    data: {
      account
    }
  });
});
const makePaymentToStore = (0, import_error.asyncHandler)(async (req, res) => {
  const errors = (0, import_express_validator.validationResult)(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  const userRole = req.user?.role;
  if (userRole !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin role required."
    });
  }
  const { storeId } = req.params;
  const { amount, description } = req.body;
  if (!storeId || !amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Store ID and valid payment amount are required"
    });
  }
  const account = await import_StoreAccount.default.findOne({ storeId: storeId.toLowerCase() });
  if (!account) {
    return res.status(404).json({
      success: false,
      message: "Store account not found"
    });
  }
  const paymentAmount = Math.min(amount, account.dueBalance);
  account.totalPaid += paymentAmount;
  account.dueBalance -= paymentAmount;
  account.lastPaymentDate = /* @__PURE__ */ new Date();
  account.lastPaymentAmount = paymentAmount;
  if (account.isPaused && account.dueBalance < account.threshold) {
    account.isPaused = false;
    account.pausedAt = void 0;
    account.pausedReason = void 0;
    await import_Store.default.findOneAndUpdate(
      { storeId: storeId.toLowerCase() },
      { isActive: true }
    );
  }
  await account.save();
  res.status(200).json({
    success: true,
    message: "Payment processed successfully",
    data: {
      account: {
        id: account._id,
        storeId: account.storeId,
        totalEarned: account.totalEarned,
        totalPaid: account.totalPaid,
        dueBalance: account.dueBalance,
        isPaused: account.isPaused,
        lastPaymentDate: account.lastPaymentDate,
        lastPaymentAmount: account.lastPaymentAmount
      },
      payment: {
        amount: paymentAmount,
        description
      }
    }
  });
});
const toggleStoreAccountStatus = (0, import_error.asyncHandler)(async (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin role required."
    });
  }
  const { storeId } = req.params;
  const { isPaused, reason } = req.body;
  if (!storeId || typeof isPaused !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "Store ID and isPaused status are required"
    });
  }
  const account = await import_StoreAccount.default.findOne({ storeId: storeId.toLowerCase() });
  if (!account) {
    return res.status(404).json({
      success: false,
      message: "Store account not found"
    });
  }
  account.isPaused = isPaused;
  if (isPaused) {
    account.pausedAt = /* @__PURE__ */ new Date();
    account.pausedReason = reason || "Manually paused by admin";
    await import_Store.default.findOneAndUpdate(
      { storeId: storeId.toLowerCase() },
      { isActive: false }
    );
  } else {
    account.pausedAt = void 0;
    account.pausedReason = void 0;
    await import_Store.default.findOneAndUpdate(
      { storeId: storeId.toLowerCase() },
      { isActive: true }
    );
  }
  await account.save();
  res.status(200).json({
    success: true,
    message: `Store account ${isPaused ? "paused" : "unpaused"} successfully`,
    data: {
      account
    }
  });
});
const validateUpdateThreshold = [
  (0, import_express_validator.body)("threshold").isFloat({ min: 0 }).withMessage("Threshold must be a non-negative number")
];
const validateMakePayment = [
  (0, import_express_validator.body)("amount").isFloat({ min: 0.01 }).withMessage("Payment amount must be a positive number"),
  (0, import_express_validator.body)("description").optional().trim()
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getStoreAccount,
  getStoreAccounts,
  makePaymentToStore,
  toggleStoreAccountStatus,
  updateStoreAccountThreshold,
  validateMakePayment,
  validateUpdateThreshold
});
