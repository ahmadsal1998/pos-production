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
var customerModel_exports = {};
__export(customerModel_exports, {
  getCustomerModel: () => getCustomerModel,
  getCustomerModelForStore: () => getCustomerModelForStore,
  getStorePrefix: () => getStorePrefix
});
module.exports = __toCommonJS(customerModel_exports);
var import_mongoose = __toESM(require("mongoose"));
var import_Store = __toESM(require("../models/Store"));
var import_databaseManager = require("./databaseManager");
const customerSchema = new import_mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    previousBalance: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);
customerSchema.index({ phone: 1 }, { unique: true });
customerSchema.index({ name: 1 });
customerSchema.index({ createdAt: -1 });
async function getStorePrefix(storeId) {
  if (!storeId) {
    throw new Error("Store ID is required");
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  if (import_mongoose.default.connection.readyState !== 1) {
    throw new Error("Database connection not available. Please try again later.");
  }
  try {
    const storeByPrefix = await import_Store.default.findOne({ prefix: normalizedStoreId }).lean();
    if (storeByPrefix) {
      return storeByPrefix.prefix;
    }
    const store = await import_Store.default.findOne({ storeId: normalizedStoreId }).lean();
    if (store) {
      return store.prefix;
    }
    if (/^[a-z0-9_]+$/.test(normalizedStoreId)) {
      return normalizedStoreId;
    }
    throw new Error(`Store not found for storeId: ${storeId}. Please ensure your account is associated with a valid store.`);
  } catch (error) {
    if (error.message.includes("Store not found") || error.message.includes("Database connection")) {
      throw error;
    }
    throw new Error(`Failed to get store prefix: ${error.message}`);
  }
}
async function getCustomerModel(prefix, databaseId) {
  if (!prefix) {
    throw new Error("Store prefix is required for customer model");
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
  const collectionName = `${sanitizedPrefix}_customers`;
  if (collectionName.length > 255) {
    throw new Error(`Collection name too long: ${collectionName}. Maximum length is 255 characters.`);
  }
  const connection = await (0, import_databaseManager.getDatabaseConnection)(dbId);
  if (connection.models[collectionName]) {
    return connection.models[collectionName];
  }
  return connection.model(collectionName, customerSchema, collectionName);
}
async function getCustomerModelForStore(storeId) {
  if (!storeId) {
    throw new Error("Store ID is required to access customers");
  }
  const prefix = await getStorePrefix(storeId);
  const databaseId = await (0, import_databaseManager.getDatabaseIdForStore)(storeId, import_Store.default);
  if (!databaseId) {
    throw new Error(`Database ID not found for store: ${storeId}`);
  }
  return getCustomerModel(prefix, databaseId);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getCustomerModel,
  getCustomerModelForStore,
  getStorePrefix
});
