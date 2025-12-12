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
var Payment_exports = {};
__export(Payment_exports, {
  Payment: () => Payment
});
module.exports = __toCommonJS(Payment_exports);
var import_mongoose = __toESM(require("mongoose"));
const paymentSchema = new import_mongoose.Schema(
  {
    invoiceId: {
      type: String,
      required: [true, "Invoice ID is required"],
      index: true
    },
    storeId: {
      type: String,
      index: true,
      default: null
    },
    merchantId: {
      type: import_mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      default: null,
      index: false
      // Explicitly disable automatic index - we use compound indexes instead
    },
    terminalId: {
      type: import_mongoose.Schema.Types.ObjectId,
      ref: "Terminal",
      index: true,
      default: null
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Amount must be positive"]
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      default: "SAR",
      uppercase: true
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Card", "Credit"],
      required: [true, "Payment method is required"]
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Declined", "Error", "Cancelled"],
      default: "Pending",
      index: true
    },
    transactionId: {
      type: String
    },
    authorizationCode: {
      type: String
    },
    terminalResponse: {
      type: import_mongoose.Schema.Types.Mixed
    },
    errorMessage: {
      type: String
    },
    processedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    autoCreate: false,
    // Prevent automatic collection creation - only create when data is inserted
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
paymentSchema.index({ invoiceId: 1, storeId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ merchantId: 1, terminalId: 1 });
paymentSchema.index({ merchantId: 1, status: 1 });
const Payment = import_mongoose.default.model("Payment", paymentSchema);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Payment
});
