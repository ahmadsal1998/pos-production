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
var storePointsAccount_controller_exports = {};
__export(storePointsAccount_controller_exports, {
  getAllStorePointsAccounts: () => getAllStorePointsAccounts,
  getStorePointsAccount: () => getStorePointsAccount,
  getStorePointsTransactions: () => getStorePointsTransactions
});
module.exports = __toCommonJS(storePointsAccount_controller_exports);
var import_error = require("../middleware/error.middleware");
var import_StorePointsAccount = __toESM(require("../models/StorePointsAccount"));
var import_PointsTransaction = __toESM(require("../models/PointsTransaction"));
var import_Store = __toESM(require("../models/Store"));
var import_logger = require("../utils/logger");
const getStorePointsAccount = (0, import_error.asyncHandler)(async (req, res) => {
  const userRole = req.user?.role;
  const storeId = req.user?.storeId || null;
  const { id } = req.params;
  const query = {};
  if (userRole !== "Admin" && req.user?.userId !== "admin") {
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
  try {
    const account = await import_StorePointsAccount.default.findOne(query);
    if (!account) {
      return res.status(200).json({
        success: true,
        data: {
          account: {
            storeId: query.storeId,
            totalPointsIssued: 0,
            totalPointsRedeemed: 0,
            netPointsBalance: 0,
            totalPointsValueIssued: 0,
            totalPointsValueRedeemed: 0,
            netFinancialBalance: 0,
            amountOwed: 0
          }
        }
      });
    }
    res.status(200).json({
      success: true,
      data: {
        account: {
          id: account._id,
          storeId: account.storeId,
          storeName: account.storeName,
          totalPointsIssued: account.totalPointsIssued,
          totalPointsRedeemed: account.totalPointsRedeemed,
          netPointsBalance: account.netPointsBalance,
          pointsValuePerPoint: account.pointsValuePerPoint,
          totalPointsValueIssued: account.totalPointsValueIssued,
          totalPointsValueRedeemed: account.totalPointsValueRedeemed,
          netFinancialBalance: account.netFinancialBalance,
          amountOwed: account.amountOwed,
          lastUpdated: account.lastUpdated
        }
      }
    });
  } catch (error) {
    import_logger.log.error("Error getting store points account", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get store points account"
    });
  }
});
const getAllStorePointsAccounts = (0, import_error.asyncHandler)(async (req, res) => {
  const userRole = req.user?.role;
  const storeId = req.user?.storeId || null;
  const isSystemAdmin = req.user?.userId === "admin";
  try {
    let accounts;
    if (userRole === "Admin" && isSystemAdmin) {
      accounts = await import_StorePointsAccount.default.find().sort({ amountOwed: -1 });
    } else {
      if (!storeId) {
        return res.status(400).json({
          success: false,
          message: "Store ID is required. Please ensure you are logged in as a store user."
        });
      }
      const account = await import_StorePointsAccount.default.findOne({
        storeId: storeId.toLowerCase()
      });
      if (!account) {
        const storeInfo = await import_Store.default.findOne({ storeId: storeId.toLowerCase() });
        accounts = [{
          storeId: storeId.toLowerCase(),
          storeName: storeInfo?.name || "Unknown Store",
          totalPointsIssued: 0,
          totalPointsRedeemed: 0,
          netPointsBalance: 0,
          pointsValuePerPoint: 0.01,
          totalPointsValueIssued: 0,
          totalPointsValueRedeemed: 0,
          netFinancialBalance: 0,
          amountOwed: 0,
          lastUpdated: /* @__PURE__ */ new Date()
        }];
      } else {
        accounts = [account];
      }
    }
    res.status(200).json({
      success: true,
      data: {
        accounts
      }
    });
  } catch (error) {
    import_logger.log.error("Error getting store points accounts", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get store points accounts"
    });
  }
});
const getStorePointsTransactions = (0, import_error.asyncHandler)(async (req, res) => {
  const userRole = req.user?.role;
  const storeId = req.user?.storeId || null;
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  const { transactionType, startDate, endDate } = req.query;
  let targetStoreId;
  if (userRole === "Admin" || req.user?.userId === "admin") {
    targetStoreId = id.toLowerCase();
  } else {
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required"
      });
    }
    targetStoreId = storeId.toLowerCase();
  }
  try {
    const query = {
      $or: [
        { earningStoreId: targetStoreId },
        { redeemingStoreId: targetStoreId }
      ]
    };
    if (transactionType) {
      query.transactionType = transactionType;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    const transactions = await import_PointsTransaction.default.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await import_PointsTransaction.default.countDocuments(query);
    const issuedTransactions = await import_PointsTransaction.default.find({
      earningStoreId: targetStoreId,
      transactionType: "earned"
    });
    const redeemedTransactions = await import_PointsTransaction.default.find({
      redeemingStoreId: targetStoreId,
      transactionType: "spent"
    });
    const totalIssued = issuedTransactions.reduce((sum, t) => sum + t.points, 0);
    const totalRedeemed = Math.abs(redeemedTransactions.reduce((sum, t) => sum + t.points, 0));
    const totalIssuedValue = issuedTransactions.reduce((sum, t) => sum + (t.pointsValue || 0), 0);
    const totalRedeemedValue = redeemedTransactions.reduce((sum, t) => sum + (t.pointsValue || 0), 0);
    res.status(200).json({
      success: true,
      data: {
        transactions,
        summary: {
          totalIssued,
          totalRedeemed,
          netPointsBalance: totalIssued - totalRedeemed,
          totalIssuedValue,
          totalRedeemedValue,
          netFinancialBalance: totalIssuedValue - totalRedeemedValue,
          amountOwed: Math.abs(totalIssuedValue - totalRedeemedValue)
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    import_logger.log.error("Error getting store points transactions", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get store points transactions"
    });
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getAllStorePointsAccounts,
  getStorePointsAccount,
  getStorePointsTransactions
});
