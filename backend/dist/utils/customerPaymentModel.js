"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var customerPaymentModel_exports = {};
__export(customerPaymentModel_exports, {
  getCustomerPaymentModel: () => getCustomerPaymentModel,
  getCustomerPaymentModelForStore: () => getCustomerPaymentModelForStore
});
module.exports = __toCommonJS(customerPaymentModel_exports);
var import_mongoose = require("mongoose");
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
      required: [true, "Store ID is required"],
      index: true
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
function getCustomerPaymentModel() {
  const collectionName = "customer_payments";
  const connection = (0, import_databaseManager.getAdminDatabaseConnection)();
  const connectionDbName = connection.db?.databaseName;
  if (connectionDbName !== "admin_db") {
    import_logger.log.warn(`Expected admin_db connection, but got: ${connectionDbName}`);
  }
  if (connection.models[collectionName]) {
    return connection.models[collectionName];
  }
  return connection.model(collectionName, customerPaymentSchema, collectionName);
}
function getCustomerPaymentModelForStore(storeId) {
  return getCustomerPaymentModel();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getCustomerPaymentModel,
  getCustomerPaymentModelForStore
});
