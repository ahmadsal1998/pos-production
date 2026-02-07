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
var points_controller_exports = {};
__export(points_controller_exports, {
  addPointsAfterSale: () => addPointsAfterSale,
  getCustomerPoints: () => getCustomerPoints,
  getCustomerPointsHistory: () => getCustomerPointsHistory,
  payWithPoints: () => payWithPoints,
  validateAddPoints: () => validateAddPoints,
  validatePayWithPoints: () => validatePayWithPoints
});
module.exports = __toCommonJS(points_controller_exports);
var import_express_validator = require("express-validator");
var import_error = require("../middleware/error.middleware");
var import_PointsTransaction = __toESM(require("../models/PointsTransaction"));
var import_PointsBalance = __toESM(require("../models/PointsBalance"));
var import_PointsSettings = __toESM(require("../models/PointsSettings"));
var import_StorePointsAccount = __toESM(require("../models/StorePointsAccount"));
var import_GlobalCustomer = __toESM(require("../models/GlobalCustomer"));
var import_Customer = __toESM(require("../models/Customer"));
var import_Store = __toESM(require("../models/Store"));
const addPointsAfterSale = (0, import_error.asyncHandler)(async (req, res, next) => {
  const errors = (0, import_express_validator.validationResult)(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  const earningStoreId = req.user?.storeId || null;
  if (!earningStoreId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required"
    });
  }
  const { invoiceNumber, customerId, purchaseAmount, pointsPercentage } = req.body;
  if (!invoiceNumber || !customerId || !purchaseAmount || purchaseAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invoice number, customer ID, and valid purchase amount are required"
    });
  }
  try {
    const customer = await import_Customer.default.findOne({ storeId: earningStoreId, _id: customerId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }
    const globalCustomer = await import_GlobalCustomer.default.getOrCreateGlobalCustomer(
      earningStoreId,
      String(customer._id),
      customer.name,
      customer.phone,
      void 0
      // email not available in Customer model
    );
    let settings = await import_PointsSettings.default.findOne({ storeId: earningStoreId });
    if (!settings) {
      settings = await import_PointsSettings.default.findOne({ storeId: "global" });
      if (!settings) {
        settings = await import_PointsSettings.default.create({
          storeId: "global",
          userPointsPercentage: 5,
          companyProfitPercentage: 2,
          defaultThreshold: 1e4
        });
      }
    }
    const effectivePercentage = pointsPercentage || settings.userPointsPercentage;
    const points = Math.floor(purchaseAmount * effectivePercentage / 100);
    if (points <= 0) {
      return res.status(400).json({
        success: false,
        message: "Purchase amount is too small to earn points"
      });
    }
    if (settings.minPurchaseAmount && purchaseAmount < settings.minPurchaseAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase amount of ${settings.minPurchaseAmount} is required to earn points`
      });
    }
    const finalPoints = settings.maxPointsPerTransaction ? Math.min(points, settings.maxPointsPerTransaction) : points;
    let expiresAt;
    if (settings.pointsExpirationDays) {
      expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setDate(expiresAt.getDate() + settings.pointsExpirationDays);
    }
    const pointsValuePerPoint = settings.pointsValuePerPoint || 0.01;
    const pointsValue = finalPoints * pointsValuePerPoint;
    const transaction = await import_PointsTransaction.default.create({
      globalCustomerId: globalCustomer.globalCustomerId,
      customerName: globalCustomer.name,
      earningStoreId: earningStoreId.toLowerCase(),
      invoiceNumber,
      transactionType: "earned",
      points: finalPoints,
      purchaseAmount,
      pointsPercentage: effectivePercentage,
      pointsValue,
      description: `Points earned from purchase at ${earningStoreId} (Invoice: ${invoiceNumber})`,
      expiresAt
    });
    const balance = await import_PointsBalance.default.findOneAndUpdate(
      { globalCustomerId: globalCustomer.globalCustomerId },
      {
        $inc: {
          totalPoints: finalPoints,
          availablePoints: finalPoints,
          lifetimeEarned: finalPoints
        },
        $set: {
          customerName: globalCustomer.name,
          customerPhone: globalCustomer.phone,
          customerEmail: globalCustomer.email,
          lastTransactionDate: /* @__PURE__ */ new Date()
        },
        $setOnInsert: {
          globalCustomerId: globalCustomer.globalCustomerId,
          // customerName, customerPhone, customerEmail are in $set (applies to both insert and update)
          // totalPoints, availablePoints, lifetimeEarned are handled by $inc (creates field with increment value if doesn't exist)
          pendingPoints: 0,
          lifetimeSpent: 0
        }
      },
      { upsert: true, new: true }
    );
    let storeAccount = await import_StorePointsAccount.default.findOne({ storeId: earningStoreId.toLowerCase() });
    if (storeAccount) {
      storeAccount.totalPointsIssued += finalPoints;
      storeAccount.totalPointsValueIssued += pointsValue;
      storeAccount.recalculate();
      await storeAccount.save();
    } else {
      const store = await import_Store.default.findOne({ storeId: earningStoreId.toLowerCase() });
      storeAccount = await import_StorePointsAccount.default.create({
        storeId: earningStoreId.toLowerCase(),
        storeName: store?.name || "Unknown Store",
        totalPointsIssued: finalPoints,
        totalPointsRedeemed: 0,
        pointsValuePerPoint,
        totalPointsValueIssued: pointsValue,
        totalPointsValueRedeemed: 0
      });
      storeAccount.recalculate();
      await storeAccount.save();
    }
    res.status(200).json({
      success: true,
      message: "Points added successfully",
      data: {
        transaction: {
          id: transaction._id,
          points: finalPoints,
          purchaseAmount,
          pointsPercentage: effectivePercentage,
          pointsValue
        },
        balance: {
          totalPoints: balance.totalPoints,
          availablePoints: balance.availablePoints
        }
      }
    });
  } catch (error) {
    next(error);
  }
});
const getCustomerPoints = (0, import_error.asyncHandler)(async (req, res, next) => {
  const customerIdFromPath = req.params.customerId;
  const { customerId, globalCustomerId, phone, email } = req.query;
  const effectiveCustomerId = customerId || customerIdFromPath;
  let globalCustomerIdToUse = null;
  try {
    if (globalCustomerId && typeof globalCustomerId === "string") {
      globalCustomerIdToUse = globalCustomerId.toLowerCase().trim();
    } else if (phone && typeof phone === "string") {
      globalCustomerIdToUse = phone.toLowerCase().trim();
    } else if (email && typeof email === "string") {
      globalCustomerIdToUse = email.toLowerCase().trim();
    } else if (effectiveCustomerId && typeof effectiveCustomerId === "string") {
      const userRole = req.user?.role;
      const storeId2 = req.user?.storeId || null;
      if (userRole !== "Admin" && !storeId2) {
        return res.status(400).json({
          success: false,
          message: "Store ID is required when using customerId"
        });
      }
      const targetStoreId = userRole === "Admin" ? null : storeId2;
      const customerQuery = { _id: effectiveCustomerId };
      if (targetStoreId) {
        customerQuery.storeId = targetStoreId;
      }
      const customer = await import_Customer.default.findOne(customerQuery);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }
      const customerStoreId = customer.storeId || targetStoreId || storeId2;
      if (!customerStoreId) {
        return res.status(400).json({
          success: false,
          message: "Store ID is required for customer lookup"
        });
      }
      const globalCustomer = await import_GlobalCustomer.default.getOrCreateGlobalCustomer(
        customerStoreId,
        String(customer._id),
        customer.name,
        customer.phone
      );
      globalCustomerIdToUse = globalCustomer.globalCustomerId;
    } else {
      return res.status(400).json({
        success: false,
        message: "Either customerId, globalCustomerId, phone, or email is required"
      });
    }
    if (!globalCustomerIdToUse) {
      return res.status(400).json({
        success: false,
        message: "Could not determine global customer ID"
      });
    }
    const balance = await import_PointsBalance.default.findOne({ globalCustomerId: globalCustomerIdToUse });
    const storeId = req.user?.storeId || null;
    let settings = null;
    if (storeId) {
      settings = await import_PointsSettings.default.findOne({ storeId: storeId.toLowerCase() });
    }
    if (!settings) {
      settings = await import_PointsSettings.default.findOne({ storeId: "global" });
    }
    const pointsValuePerPoint = settings?.pointsValuePerPoint || 0.01;
    if (!balance) {
      return res.status(200).json({
        success: true,
        data: {
          balance: {
            globalCustomerId: globalCustomerIdToUse,
            totalPoints: 0,
            availablePoints: 0,
            lifetimeEarned: 0,
            lifetimeSpent: 0
          },
          pointsValuePerPoint
        }
      });
    }
    res.status(200).json({
      success: true,
      data: {
        balance: {
          id: balance._id,
          globalCustomerId: balance.globalCustomerId,
          customerName: balance.customerName,
          totalPoints: balance.totalPoints,
          availablePoints: balance.availablePoints,
          lifetimeEarned: balance.lifetimeEarned,
          lifetimeSpent: balance.lifetimeSpent,
          lastTransactionDate: balance.lastTransactionDate
        },
        pointsValuePerPoint
      }
    });
  } catch (error) {
    next(error);
  }
});
const getCustomerPointsHistory = (0, import_error.asyncHandler)(async (req, res, next) => {
  const customerIdFromPath = req.params.customerId;
  const { customerId, globalCustomerId, phone, email } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const effectiveCustomerId = customerId || customerIdFromPath;
  let globalCustomerIdToUse = null;
  try {
    if (globalCustomerId && typeof globalCustomerId === "string") {
      globalCustomerIdToUse = globalCustomerId.toLowerCase().trim();
    } else if (phone && typeof phone === "string") {
      globalCustomerIdToUse = phone.toLowerCase().trim();
    } else if (email && typeof email === "string") {
      globalCustomerIdToUse = email.toLowerCase().trim();
    } else if (effectiveCustomerId && typeof effectiveCustomerId === "string") {
      const userRole = req.user?.role;
      const storeId = req.user?.storeId || null;
      if (userRole !== "Admin" && !storeId) {
        return res.status(400).json({
          success: false,
          message: "Store ID is required when using customerId"
        });
      }
      const targetStoreId = userRole === "Admin" ? null : storeId;
      const customerQuery = { _id: effectiveCustomerId };
      if (targetStoreId) {
        customerQuery.storeId = targetStoreId;
      }
      const customer = await import_Customer.default.findOne(customerQuery);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }
      const customerStoreId = customer.storeId || targetStoreId || storeId;
      if (!customerStoreId) {
        return res.status(400).json({
          success: false,
          message: "Store ID is required for customer lookup"
        });
      }
      const globalCustomer = await import_GlobalCustomer.default.getOrCreateGlobalCustomer(
        customerStoreId,
        String(customer._id),
        customer.name,
        customer.phone
      );
      globalCustomerIdToUse = globalCustomer.globalCustomerId;
    } else {
      return res.status(400).json({
        success: false,
        message: "Either customerId, globalCustomerId, phone, or email is required"
      });
    }
    if (!globalCustomerIdToUse) {
      return res.status(400).json({
        success: false,
        message: "Could not determine global customer ID"
      });
    }
    const transactions = await import_PointsTransaction.default.find({ globalCustomerId: globalCustomerIdToUse }).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await import_PointsTransaction.default.countDocuments({ globalCustomerId: globalCustomerIdToUse });
    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});
const payWithPoints = (0, import_error.asyncHandler)(async (req, res, next) => {
  const errors = (0, import_express_validator.validationResult)(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  const redeemingStoreId = req.user?.storeId || null;
  if (!redeemingStoreId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required"
    });
  }
  const { customerId, globalCustomerId, phone, email, points, invoiceNumber, description } = req.body;
  if (!points || points <= 0) {
    return res.status(400).json({
      success: false,
      message: "Valid points amount is required"
    });
  }
  try {
    let globalCustomerIdToUse = null;
    if (globalCustomerId) {
      globalCustomerIdToUse = globalCustomerId.toLowerCase().trim();
    } else if (phone) {
      globalCustomerIdToUse = phone.toLowerCase().trim();
    } else if (email) {
      globalCustomerIdToUse = email.toLowerCase().trim();
    } else if (customerId) {
      const customer = await import_Customer.default.findOne({ storeId: redeemingStoreId, _id: customerId });
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }
      const globalCustomer = await import_GlobalCustomer.default.getOrCreateGlobalCustomer(
        redeemingStoreId,
        String(customer._id),
        customer.name,
        customer.phone
      );
      globalCustomerIdToUse = globalCustomer.globalCustomerId;
    } else {
      return res.status(400).json({
        success: false,
        message: "Either customerId, globalCustomerId, phone, or email is required"
      });
    }
    if (!globalCustomerIdToUse) {
      return res.status(400).json({
        success: false,
        message: "Could not determine global customer ID"
      });
    }
    const balance = await import_PointsBalance.default.findOne({ globalCustomerId: globalCustomerIdToUse });
    if (!balance || balance.availablePoints < points) {
      return res.status(400).json({
        success: false,
        message: "Insufficient points balance",
        data: {
          availablePoints: balance?.availablePoints || 0,
          requestedPoints: points
        }
      });
    }
    const settings = await import_PointsSettings.default.findOne({ storeId: redeemingStoreId }) || await import_PointsSettings.default.findOne({ storeId: "global" }) || await import_PointsSettings.default.create({ storeId: "global", userPointsPercentage: 5, companyProfitPercentage: 2, defaultThreshold: 1e4 });
    const pointsValuePerPoint = settings.pointsValuePerPoint || 0.01;
    const pointsValue = points * pointsValuePerPoint;
    const transaction = await import_PointsTransaction.default.create({
      globalCustomerId: globalCustomerIdToUse,
      customerName: balance.customerName,
      redeemingStoreId: redeemingStoreId.toLowerCase(),
      invoiceNumber,
      transactionType: "spent",
      points: -points,
      // Negative for spent
      pointsValue,
      description: description || `Points used for payment at ${redeemingStoreId}${invoiceNumber ? ` (Invoice: ${invoiceNumber})` : ""}`
    });
    balance.totalPoints -= points;
    balance.availablePoints -= points;
    balance.lifetimeSpent += points;
    balance.lastTransactionDate = /* @__PURE__ */ new Date();
    await balance.save();
    let storeAccount = await import_StorePointsAccount.default.findOne({ storeId: redeemingStoreId.toLowerCase() });
    if (storeAccount) {
      storeAccount.totalPointsRedeemed += points;
      storeAccount.totalPointsValueRedeemed += pointsValue;
      storeAccount.recalculate();
      await storeAccount.save();
    } else {
      const store = await import_Store.default.findOne({ storeId: redeemingStoreId.toLowerCase() });
      storeAccount = await import_StorePointsAccount.default.create({
        storeId: redeemingStoreId.toLowerCase(),
        storeName: store?.name || "Unknown Store",
        totalPointsIssued: 0,
        totalPointsRedeemed: points,
        pointsValuePerPoint,
        totalPointsValueIssued: 0,
        totalPointsValueRedeemed: pointsValue
      });
      storeAccount.recalculate();
      await storeAccount.save();
    }
    res.status(200).json({
      success: true,
      message: "Points deducted successfully",
      data: {
        transaction: {
          id: transaction._id,
          points: -points,
          pointsValue
        },
        balance: {
          totalPoints: balance.totalPoints,
          availablePoints: balance.availablePoints
        }
      }
    });
  } catch (error) {
    next(error);
  }
});
const validateAddPoints = [
  (0, import_express_validator.body)("invoiceNumber").trim().notEmpty().withMessage("Invoice number is required"),
  (0, import_express_validator.body)("customerId").trim().notEmpty().withMessage("Customer ID is required"),
  (0, import_express_validator.body)("purchaseAmount").isFloat({ min: 0.01 }).withMessage("Purchase amount must be a positive number"),
  (0, import_express_validator.body)("pointsPercentage").optional().isFloat({ min: 0, max: 100 }).withMessage("Points percentage must be between 0 and 100")
];
const validatePayWithPoints = [
  (0, import_express_validator.body)("points").isInt({ min: 1 }).withMessage("Points must be a positive integer"),
  (0, import_express_validator.body)("customerId").optional().trim(),
  (0, import_express_validator.body)("globalCustomerId").optional().trim(),
  (0, import_express_validator.body)("phone").optional().trim(),
  (0, import_express_validator.body)("email").optional().trim().isEmail().withMessage("Email must be valid"),
  (0, import_express_validator.body)("invoiceNumber").optional().trim(),
  (0, import_express_validator.body)("description").optional().trim()
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addPointsAfterSale,
  getCustomerPoints,
  getCustomerPointsHistory,
  payWithPoints,
  validateAddPoints,
  validatePayWithPoints
});
