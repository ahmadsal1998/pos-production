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
var Sale_exports = {};
__export(Sale_exports, {
  Sale: () => Sale
});
module.exports = __toCommonJS(Sale_exports);
var import_mongoose = __toESM(require("mongoose"));
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
    },
    costPrice: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);
const saleSchema = new import_mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required"]
      // Index is created via compound index below
    },
    storeId: {
      type: String,
      required: [true, "Store ID is required"],
      trim: true,
      lowercase: true
      // Index is created via compound indexes below
    },
    date: {
      type: Date,
      required: [true, "Sale date is required"],
      default: Date.now
      // Index is created via compound index below
    },
    customerId: {
      type: String,
      default: null
      // Index is created via compound index below
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
      lowercase: true
      // Index is created via compound index below
    },
    status: {
      type: String,
      enum: ["completed", "partial_payment", "pending", "refunded", "partial_refund"],
      default: "completed"
      // Index is created via compound index below
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
saleSchema.index({ storeId: 1, invoiceNumber: 1 }, { unique: true });
saleSchema.index({ storeId: 1, date: -1 });
saleSchema.index({ storeId: 1, customerId: 1 });
saleSchema.index({ storeId: 1, status: 1 });
saleSchema.index({ storeId: 1, paymentMethod: 1 });
saleSchema.index({ storeId: 1, createdAt: -1 });
const Sale = import_mongoose.default.model("Sale", saleSchema);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Sale
});
