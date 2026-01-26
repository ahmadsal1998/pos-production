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
var StorePointsAccount_exports = {};
__export(StorePointsAccount_exports, {
  StorePointsAccount: () => StorePointsAccount,
  default: () => StorePointsAccount_default
});
module.exports = __toCommonJS(StorePointsAccount_exports);
var import_mongoose = __toESM(require("mongoose"));
const storePointsAccountSchema = new import_mongoose.Schema(
  {
    storeId: {
      type: String,
      required: [true, "Store ID is required"],
      trim: true,
      lowercase: true
    },
    storeName: {
      type: String,
      required: [true, "Store name is required"],
      trim: true
    },
    totalPointsIssued: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPointsRedeemed: {
      type: Number,
      default: 0,
      min: 0
    },
    netPointsBalance: {
      type: Number,
      default: 0
    },
    pointsValuePerPoint: {
      type: Number,
      default: 0.01,
      // Default: 1 point = $0.01
      min: 0
    },
    totalPointsValueIssued: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPointsValueRedeemed: {
      type: Number,
      default: 0,
      min: 0
    },
    netFinancialBalance: {
      type: Number,
      default: 0
    },
    amountOwed: {
      type: Number,
      default: 0,
      min: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
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
storePointsAccountSchema.index({ storeId: 1 }, { unique: true });
storePointsAccountSchema.index({ netPointsBalance: -1 });
storePointsAccountSchema.index({ amountOwed: -1 });
storePointsAccountSchema.index({ lastUpdated: -1 });
storePointsAccountSchema.methods.recalculate = function() {
  this.netPointsBalance = this.totalPointsIssued - this.totalPointsRedeemed;
  this.totalPointsValueIssued = this.totalPointsIssued * this.pointsValuePerPoint;
  this.totalPointsValueRedeemed = this.totalPointsRedeemed * this.pointsValuePerPoint;
  this.netFinancialBalance = this.totalPointsValueIssued - this.totalPointsValueRedeemed;
  this.amountOwed = Math.abs(this.netFinancialBalance);
  this.lastUpdated = /* @__PURE__ */ new Date();
};
const StorePointsAccount = import_mongoose.default.model(
  "StorePointsAccount",
  storePointsAccountSchema
);
var StorePointsAccount_default = StorePointsAccount;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  StorePointsAccount
});
