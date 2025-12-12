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
var unitModel_exports = {};
__export(unitModel_exports, {
  getStorePrefix: () => getStorePrefix,
  getUnitModel: () => getUnitModel,
  getUnitModelForStore: () => getUnitModelForStore
});
module.exports = __toCommonJS(unitModel_exports);
var import_mongoose = __toESM(require("mongoose"));
var import_Store = __toESM(require("../models/Store"));
var import_databaseManager = require("./databaseManager");
const unitSchema = new import_mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Unit name is required"],
      trim: true
    },
    description: {
      type: String,
      trim: true
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
unitSchema.index({ name: 1 }, { unique: true });
unitSchema.index({ createdAt: -1 });
async function getStorePrefix(storeId) {
  if (!storeId) {
    throw new Error("Store ID is required");
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  console.log("\u{1F50D} getStorePrefix (Unit) - Looking up store for storeId:", normalizedStoreId);
  if (import_mongoose.default.connection.readyState !== 1) {
    console.error("\u274C getStorePrefix (Unit) - Database not connected. ReadyState:", import_mongoose.default.connection.readyState);
    throw new Error("Database connection not available. Please try again later.");
  }
  try {
    const storeByPrefix = await import_Store.default.findOne({ prefix: normalizedStoreId }).lean();
    if (storeByPrefix) {
      console.log("\u2705 getStorePrefix (Unit) - Found store by prefix:", storeByPrefix.prefix);
      return storeByPrefix.prefix;
    }
    const store = await import_Store.default.findOne({ storeId: normalizedStoreId }).lean();
    if (store) {
      console.log("\u2705 getStorePrefix (Unit) - Found store by storeId field, prefix:", store.prefix);
      return store.prefix;
    }
    if (/^[a-z0-9_]+$/.test(normalizedStoreId)) {
      console.log("\u26A0\uFE0F getStorePrefix (Unit) - Store not found in DB, but valid format. Using as prefix:", normalizedStoreId);
      return normalizedStoreId;
    }
    console.error("\u274C getStorePrefix (Unit) - Store not found for storeId:", normalizedStoreId);
    throw new Error(`Store not found for storeId: ${storeId}. Please ensure your account is associated with a valid store.`);
  } catch (error) {
    console.error("\u274C getStorePrefix (Unit) - Error:", {
      message: error.message,
      stack: error.stack,
      storeId: normalizedStoreId
    });
    if (error.message.includes("Store not found") || error.message.includes("Database connection")) {
      throw error;
    }
    throw new Error(`Failed to get store prefix: ${error.message}`);
  }
}
async function getUnitModel(prefix, databaseId) {
  if (!prefix) {
    const defaultCollectionName = "units";
    if (import_mongoose.default.models[defaultCollectionName]) {
      return import_mongoose.default.models[defaultCollectionName];
    }
    return import_mongoose.default.model(defaultCollectionName, unitSchema, defaultCollectionName);
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
  const collectionName = `${sanitizedPrefix}_units`;
  if (collectionName.length > 255) {
    throw new Error(`Collection name too long: ${collectionName}. Maximum length is 255 characters.`);
  }
  const connection = await (0, import_databaseManager.getDatabaseConnection)(dbId);
  const connectionDbName = connection.db?.databaseName;
  if (connectionDbName && connectionDbName !== (0, import_databaseManager.getDatabaseName)(dbId)) {
    console.warn(`\u26A0\uFE0F Database name mismatch: Expected ${(0, import_databaseManager.getDatabaseName)(dbId)}, got ${connectionDbName}`);
  }
  if (connection.models[collectionName]) {
    return connection.models[collectionName];
  }
  return connection.model(collectionName, unitSchema, collectionName);
}
async function getUnitModelForStore(storeId) {
  if (!storeId) {
    throw new Error("Store ID is required to access units");
  }
  const prefix = await getStorePrefix(storeId);
  const databaseId = await (0, import_databaseManager.getDatabaseIdForStore)(storeId, import_Store.default);
  if (!databaseId) {
    throw new Error(`Database ID not found for store: ${storeId}`);
  }
  return getUnitModel(prefix, databaseId);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getStorePrefix,
  getUnitModel,
  getUnitModelForStore
});
