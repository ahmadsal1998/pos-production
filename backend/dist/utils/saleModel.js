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
var saleModel_exports = {};
__export(saleModel_exports, {
  getSaleModel: () => getSaleModel,
  getSaleModelForStore: () => getSaleModelForStore,
  getStorePrefix: () => getStorePrefix
});
module.exports = __toCommonJS(saleModel_exports);
var import_mongoose = __toESM(require("mongoose"));
var import_Store = __toESM(require("../models/Store"));
var import_databaseManager = require("./databaseManager");
const saleItemSchema = new import_mongoose.Schema(
  {
    productId: {
      type: String,
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unitPrice: {
      type: Number,
      required: true
      // Allow negative for return invoices (negative prices represent refunds)
    },
    totalPrice: {
      type: Number,
      required: true
      // Allow negative for return invoices
    },
    unit: {
      type: String,
      default: "\u0642\u0637\u0639\u0629"
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    conversionFactor: {
      type: Number,
      default: 1
    }
  },
  { _id: false }
);
const saleSchema = new import_mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required"],
      index: true
    },
    storeId: {
      type: String,
      index: true,
      default: null
    },
    date: {
      type: Date,
      required: [true, "Sale date is required"],
      default: Date.now,
      index: true
    },
    customerId: {
      type: String,
      index: true,
      default: null
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"]
    },
    items: {
      type: [saleItemSchema],
      required: [true, "Sale items are required"],
      validate: {
        validator: (items) => items.length > 0,
        message: "Sale must have at least one item"
      }
    },
    subtotal: {
      type: Number,
      required: true
      // Allow negative for return invoices
    },
    totalItemDiscount: {
      type: Number,
      default: 0
      // Allow negative for return invoices
    },
    invoiceDiscount: {
      type: Number,
      default: 0
      // Allow negative for return invoices
    },
    tax: {
      type: Number,
      default: 0
      // Allow negative for return invoices
    },
    total: {
      type: Number,
      required: true
      // Allow negative for return invoices
    },
    paidAmount: {
      type: Number,
      required: true
      // Allow negative for return invoices (refunds)
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "credit"],
      required: [true, "Payment method is required"],
      lowercase: true,
      index: true
    },
    status: {
      type: String,
      enum: ["completed", "partial_payment", "pending", "refunded", "partial_refund"],
      default: "completed",
      index: true
    },
    seller: {
      type: String,
      required: [true, "Seller is required"]
    },
    // Return-related fields
    originalInvoiceId: {
      type: String,
      index: true,
      default: null
    },
    isReturn: {
      type: Boolean,
      default: false,
      index: true
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
saleSchema.index({ invoiceNumber: 1, storeId: 1 }, { unique: true });
saleSchema.index({ date: -1, storeId: 1 });
saleSchema.index({ customerId: 1, storeId: 1 });
saleSchema.index({ status: 1, storeId: 1 });
saleSchema.index({ paymentMethod: 1, storeId: 1 });
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
async function getSaleModel(prefix, databaseId) {
  if (!prefix) {
    throw new Error("Store prefix is required for sale model");
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
  const collectionName = `${sanitizedPrefix}_sales`;
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
  return connection.model(collectionName, saleSchema, collectionName);
}
async function getSaleModelForStore(storeId) {
  if (!storeId) {
    throw new Error("Store ID is required to access sales");
  }
  const prefix = await getStorePrefix(storeId);
  const databaseId = await (0, import_databaseManager.getDatabaseIdForStore)(storeId, import_Store.default);
  if (!databaseId) {
    throw new Error(`Database ID not found for store: ${storeId}`);
  }
  return getSaleModel(prefix, databaseId);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getSaleModel,
  getSaleModelForStore,
  getStorePrefix
});
