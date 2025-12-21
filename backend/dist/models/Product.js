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
var Product_exports = {};
__export(Product_exports, {
  default: () => Product_default
});
module.exports = __toCommonJS(Product_exports);
var import_mongoose = __toESM(require("mongoose"));
const productSchema = new import_mongoose.Schema(
  {
    storeId: {
      type: String,
      required: [true, "Store ID is required"],
      trim: true,
      lowercase: true
      // Index is created via compound indexes below
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true
    },
    barcode: {
      type: String,
      required: [true, "Barcode is required"],
      trim: true
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
productSchema.index({ storeId: 1, barcode: 1 }, { unique: true });
productSchema.index({ storeId: 1, status: 1 });
productSchema.index({ storeId: 1, categoryId: 1 });
productSchema.index({ storeId: 1, brandId: 1 });
productSchema.index({ storeId: 1, showInQuickProducts: 1 });
productSchema.index({ storeId: 1, name: 1 });
productSchema.index({ storeId: 1, createdAt: -1 });
productSchema.index({ storeId: 1, "units.barcode": 1 });
productSchema.index({ storeId: 1, internalSKU: 1 });
const Product = import_mongoose.default.model("Product", productSchema);
var Product_default = Product;
