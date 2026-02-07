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
var merchants_controller_exports = {};
__export(merchants_controller_exports, {
  createMerchant: () => createMerchant,
  deleteMerchant: () => deleteMerchant,
  getMerchant: () => getMerchant,
  getMerchants: () => getMerchants,
  updateMerchant: () => updateMerchant
});
module.exports = __toCommonJS(merchants_controller_exports);
var import_Merchant = require("../models/Merchant");
var import_Store = __toESM(require("../models/Store"));
var import_error = require("../middleware/error.middleware");
const getMerchants = (0, import_error.asyncHandler)(async (req, res, next) => {
  try {
    const storeId = req.user?.storeId;
    const query = {};
    if (storeId && req.user?.role !== "Admin") {
      query.storeId = storeId;
    }
    const merchants = await import_Merchant.Merchant.find(query).sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: { merchants }
    });
  } catch (error) {
    next(error);
  }
});
const getMerchant = (0, import_error.asyncHandler)(async (req, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user?.storeId;
    const query = { _id: id };
    if (storeId && req.user?.role !== "Admin") {
      query.storeId = storeId;
    }
    const merchant = await import_Merchant.Merchant.findOne(query);
    if (!merchant) {
      res.status(404).json({
        success: false,
        message: "Merchant not found"
      });
      return;
    }
    let terminals = [];
    if (merchant.storeId) {
      const store = await import_Store.default.findOne({ storeId: merchant.storeId.toLowerCase() });
      if (store && store.terminals && store.terminals.length > 0) {
        terminals = store.terminals.map((term) => ({
          ...term,
          storeId: store.storeId,
          id: term._id?.toString() || ""
        }));
      }
    }
    res.status(200).json({
      success: true,
      data: {
        merchant,
        terminals
      }
    });
  } catch (error) {
    next(error);
  }
});
const createMerchant = (0, import_error.asyncHandler)(async (req, res, next) => {
  try {
    const { name, merchantId, storeId, description, status } = req.body;
    const userStoreId = req.user?.storeId;
    if (!name || !merchantId) {
      res.status(400).json({
        success: false,
        message: "Name and Merchant ID (MID) are required"
      });
      return;
    }
    if (req.user?.role !== "Admin") {
      if (!userStoreId) {
        res.status(403).json({
          success: false,
          message: "Access denied. Store ID is required."
        });
        return;
      }
      req.body.storeId = userStoreId;
    }
    const existingMerchant = await import_Merchant.Merchant.findOne({ merchantId: merchantId.toUpperCase() });
    if (existingMerchant) {
      res.status(400).json({
        success: false,
        message: "Merchant ID already exists"
      });
      return;
    }
    const merchant = new import_Merchant.Merchant({
      name,
      merchantId: merchantId.toUpperCase(),
      storeId: storeId || userStoreId || null,
      description,
      status: status || "Active"
    });
    await merchant.save();
    res.status(201).json({
      success: true,
      message: "Merchant created successfully",
      data: { merchant }
    });
  } catch (error) {
    next(error);
  }
});
const updateMerchant = (0, import_error.asyncHandler)(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, merchantId, description, status } = req.body;
    const storeId = req.user?.storeId;
    const query = { _id: id };
    if (storeId && req.user?.role !== "Admin") {
      query.storeId = storeId;
    }
    const merchant = await import_Merchant.Merchant.findOne(query);
    if (!merchant) {
      res.status(404).json({
        success: false,
        message: "Merchant not found"
      });
      return;
    }
    if (name) merchant.name = name;
    if (merchantId) {
      if (merchantId.toUpperCase() !== merchant.merchantId) {
        const existingMerchant = await import_Merchant.Merchant.findOne({ merchantId: merchantId.toUpperCase() });
        if (existingMerchant) {
          res.status(400).json({
            success: false,
            message: "Merchant ID already exists"
          });
          return;
        }
        merchant.merchantId = merchantId.toUpperCase();
      }
    }
    if (description !== void 0) merchant.description = description;
    if (status) merchant.status = status;
    await merchant.save();
    res.status(200).json({
      success: true,
      message: "Merchant updated successfully",
      data: { merchant }
    });
  } catch (error) {
    next(error);
  }
});
const deleteMerchant = (0, import_error.asyncHandler)(async (req, res, next) => {
  try {
    const { id } = req.params;
    const storeId = req.user?.storeId;
    const query = { _id: id };
    if (storeId && req.user?.role !== "Admin") {
      query.storeId = storeId;
    }
    const merchant = await import_Merchant.Merchant.findOne(query);
    if (!merchant) {
      res.status(404).json({
        success: false,
        message: "Merchant not found"
      });
      return;
    }
    if (merchant.storeId) {
      const store = await import_Store.default.findOne({ storeId: merchant.storeId.toLowerCase() });
      if (store && store.terminals && store.terminals.length > 0) {
        const terminalCount = store.terminals.filter(
          (t) => t.merchantIdMid?.toUpperCase() === merchant.merchantId.toUpperCase()
        ).length;
        if (terminalCount > 0) {
          res.status(400).json({
            success: false,
            message: `Cannot delete merchant. ${terminalCount} terminal(s) in store '${merchant.storeId}' use this merchant's MID.`
          });
          return;
        }
      }
    }
    await merchant.deleteOne();
    res.status(200).json({
      success: true,
      message: "Merchant deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createMerchant,
  deleteMerchant,
  getMerchant,
  getMerchants,
  updateMerchant
});
