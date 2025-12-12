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
var productModel_exports = {};
__export(productModel_exports, {
  getProductModel: () => getProductModel,
  getProductModelForStore: () => getProductModelForStore,
  getStorePrefix: () => getStorePrefix
});
module.exports = __toCommonJS(productModel_exports);
var import_mongoose = __toESM(require("mongoose"));
var import_Store = __toESM(require("../models/Store"));
var import_databaseManager = require("./databaseManager");
const productSchema = new import_mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true
    },
    barcode: {
      type: String,
      required: [true, "Barcode is required"],
      trim: true,
      unique: true
    },
    costPrice: {
      type: Number,
      required: [true, "Cost price is required"],
      min: [0, "Cost price cannot be negative"]
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"]
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"]
    },
    warehouseId: {
      type: String,
      trim: true
    },
    categoryId: {
      type: String,
      trim: true
    },
    brandId: {
      type: String,
      trim: true
    },
    mainUnitId: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    lowStockAlert: {
      type: Number,
      default: 10,
      min: [0, "Low stock alert cannot be negative"]
    },
    internalSKU: {
      type: String,
      trim: true
    },
    vatPercentage: {
      type: Number,
      default: 0,
      min: [0, "VAT percentage cannot be negative"],
      max: [100, "VAT percentage cannot exceed 100"]
    },
    vatInclusive: {
      type: Boolean,
      default: false
    },
    productionDate: {
      type: Date
    },
    expiryDate: {
      type: Date
    },
    batchNumber: {
      type: String,
      trim: true
    },
    discountRules: {
      enabled: {
        type: Boolean,
        default: false
      },
      percentage: {
        type: Number,
        default: 0,
        min: [0, "Discount percentage cannot be negative"],
        max: [100, "Discount percentage cannot exceed 100"]
      },
      minQuantity: {
        type: Number,
        min: [1, "Minimum quantity must be at least 1"]
      }
    },
    wholesalePrice: {
      type: Number,
      min: [0, "Wholesale price cannot be negative"]
    },
    units: [
      {
        unitName: {
          type: String,
          required: true,
          trim: true
        },
        barcode: {
          type: String,
          trim: true
        },
        sellingPrice: {
          type: Number,
          required: true,
          min: [0, "Selling price cannot be negative"]
        },
        conversionFactor: {
          type: Number,
          default: 1,
          min: [1, "Conversion factor must be at least 1"]
        }
      }
    ],
    multiWarehouseDistribution: [
      {
        warehouseId: {
          type: String,
          required: true,
          trim: true
        },
        quantity: {
          type: Number,
          required: true,
          min: [0, "Quantity cannot be negative"]
        }
      }
    ],
    status: {
      type: String,
      enum: ["active", "inactive", "hidden"],
      default: "active"
    },
    images: [String],
    showInQuickProducts: {
      type: Boolean,
      default: false
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
productSchema.index({ barcode: 1 }, { unique: true });
productSchema.index({ name: 1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ brandId: 1 });
productSchema.index({ warehouseId: 1 });
productSchema.index({ status: 1 });
productSchema.index({ showInQuickProducts: 1 });
productSchema.index({ createdAt: -1 });
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
async function getProductModel(prefix, databaseId) {
  if (!prefix) {
    const defaultCollectionName = "products";
    if (import_mongoose.default.models[defaultCollectionName]) {
      return import_mongoose.default.models[defaultCollectionName];
    }
    return import_mongoose.default.model(defaultCollectionName, productSchema, defaultCollectionName);
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
  const collectionName = `${sanitizedPrefix}_products`;
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
  return connection.model(collectionName, productSchema, collectionName);
}
async function getProductModelForStore(storeId) {
  if (!storeId) {
    throw new Error("Store ID is required to access products");
  }
  const prefix = await getStorePrefix(storeId);
  const databaseId = await (0, import_databaseManager.getDatabaseIdForStore)(storeId, import_Store.default);
  if (!databaseId) {
    throw new Error(`Database ID not found for store: ${storeId}`);
  }
  return getProductModel(prefix, databaseId);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getProductModel,
  getProductModelForStore,
  getStorePrefix
});
