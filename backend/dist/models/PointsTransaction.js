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
var PointsTransaction_exports = {};
__export(PointsTransaction_exports, {
  PointsTransaction: () => PointsTransaction,
  default: () => PointsTransaction_default
});
module.exports = __toCommonJS(PointsTransaction_exports);
var import_mongoose = __toESM(require("mongoose"));
const pointsTransactionSchema = new import_mongoose.Schema(
  {
    globalCustomerId: {
      type: String,
      required: [true, "Global customer ID is required"],
      trim: true,
      lowercase: true
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true
    },
    earningStoreId: {
      type: String,
      trim: true,
      lowercase: true
    },
    redeemingStoreId: {
      type: String,
      trim: true,
      lowercase: true
    },
    invoiceNumber: {
      type: String,
      trim: true
    },
    transactionType: {
      type: String,
      enum: ["earned", "spent", "expired", "adjusted"],
      required: [true, "Transaction type is required"]
    },
    points: {
      type: Number,
      required: [true, "Points amount is required"]
    },
    purchaseAmount: {
      type: Number,
      min: 0
    },
    pointsPercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    pointsValue: {
      type: Number,
      min: 0
    },
    description: {
      type: String,
      trim: true
    },
    expiresAt: {
      type: Date
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
pointsTransactionSchema.index({ globalCustomerId: 1, createdAt: -1 });
pointsTransactionSchema.index({ earningStoreId: 1, transactionType: 1, createdAt: -1 });
pointsTransactionSchema.index({ redeemingStoreId: 1, transactionType: 1, createdAt: -1 });
pointsTransactionSchema.index({ invoiceNumber: 1 });
pointsTransactionSchema.index({ transactionType: 1, createdAt: -1 });
const PointsTransaction = import_mongoose.default.model(
  "PointsTransaction",
  pointsTransactionSchema
);
var PointsTransaction_default = PointsTransaction;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PointsTransaction
});
