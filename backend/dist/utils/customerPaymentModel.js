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
var customerPaymentModel_exports = {};
__export(customerPaymentModel_exports, {
  getCustomerPaymentModel: () => getCustomerPaymentModel,
  getCustomerPaymentModelForStore: () => getCustomerPaymentModelForStore
});
module.exports = __toCommonJS(customerPaymentModel_exports);
var import_mongoose = require("mongoose");
var import_Store = __toESM(require("../models/Store"));
var import_databaseManager = require("./databaseManager");
var import_logger = require("./logger");
const customerPaymentSchema = new import_mongoose.Schema(
  {
    customerId: {
      type: String,
      required: [true, "Customer ID is required"],
      index: true
    },
    storeId: {
      type: String,
      index: true,
      default: null
    },
    date: {
      type: Date,
      required: [true, "Payment date is required"],
      default: Date.now,
      index: true
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"]
      // Allow negative amounts for debt operations (positive for balance, negative for debt)
    },
    method: {
      type: String,
      enum: ["Cash", "Bank Transfer", "Cheque"],
      required: [true, "Payment method is required"],
      index: true
    },
    invoiceId: {
      type: String,
      index: true,
      default: null
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);
customerPaymentSchema.index({ customerId: 1, storeId: 1 });
customerPaymentSchema.index({ date: -1, storeId: 1 });
customerPaymentSchema.index({ method: 1, storeId: 1 });
customerPaymentSchema.index({ invoiceId: 1, storeId: 1 });
async function getStorePrefix(storeId) {
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    let store = await import_Store.default.findOne({ storeId: normalizedStoreId }).lean();
    if (!store) {
      store = await import_Store.default.findOne({ prefix: normalizedStoreId }).lean();
    }
    if (store && store.prefix) {
      return store.prefix;
    }
    return null;
  } catch (error) {
    import_logger.log.error(`Error getting store prefix for ${storeId}`, error);
    throw new Error(`Failed to get store prefix: ${error.message}`);
  }
}
async function getCustomerPaymentModel(prefix, databaseId) {
  if (!prefix) {
    throw new Error("Store prefix is required for customer payment model");
  }
  let finalDatabaseId = databaseId;
  if (!finalDatabaseId) {
    finalDatabaseId = await (0, import_databaseManager.getDatabaseIdForStore)(prefix, import_Store.default);
    if (!finalDatabaseId) {
      throw new Error(`Database ID not found for store with prefix: ${prefix}`);
    }
  }
  const dbId = finalDatabaseId;
  const sanitizedPrefix = prefix.toLowerCase().trim();
  if (!sanitizedPrefix || !/^[a-z0-9_]+$/.test(sanitizedPrefix)) {
    throw new Error(`Invalid store prefix: ${prefix}. Prefix can only contain lowercase letters, numbers, and underscores.`);
  }
  const collectionName = `${sanitizedPrefix}_customer_payments`;
  if (collectionName.length > 255) {
    throw new Error(`Collection name too long: ${collectionName}. Maximum length is 255 characters.`);
  }
  const connection = await (0, import_databaseManager.getDatabaseConnection)(dbId);
  const connectionDbName = connection.db?.databaseName;
  if (connectionDbName && connectionDbName !== (0, import_databaseManager.getDatabaseName)(dbId)) {
    import_logger.log.warn(`Database name mismatch: Expected ${(0, import_databaseManager.getDatabaseName)(dbId)}, got ${connectionDbName}`);
  }
  if (connection.models[collectionName]) {
    return connection.models[collectionName];
  }
  return connection.model(collectionName, customerPaymentSchema, collectionName);
}
async function getCustomerPaymentModelForStore(storeId) {
  if (!storeId) {
    throw new Error("Store ID is required to access customer payments");
  }
  const prefix = await getStorePrefix(storeId);
  const databaseId = await (0, import_databaseManager.getDatabaseIdForStore)(storeId, import_Store.default);
  if (!databaseId) {
    throw new Error(`Database ID not found for store: ${storeId}`);
  }
  return getCustomerPaymentModel(prefix, databaseId);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getCustomerPaymentModel,
  getCustomerPaymentModelForStore
});
