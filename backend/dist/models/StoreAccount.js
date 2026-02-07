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
var StoreAccount_exports = {};
__export(StoreAccount_exports, {
  StoreAccount: () => StoreAccount,
  default: () => StoreAccount_default
});
module.exports = __toCommonJS(StoreAccount_exports);
var import_mongoose = __toESM(require("mongoose"));
const storeAccountSchema = new import_mongoose.Schema(
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
    totalEarned: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    dueBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    threshold: {
      type: Number,
      required: [true, "Threshold is required"],
      default: 1e4,
      // Default threshold of 10,000
      min: 0
    },
    isPaused: {
      type: Boolean,
      default: false
    },
    pausedAt: {
      type: Date
    },
    pausedReason: {
      type: String,
      trim: true
    },
    lastPaymentDate: {
      type: Date
    },
    lastPaymentAmount: {
      type: Number,
      min: 0
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
storeAccountSchema.index({ storeId: 1 }, { unique: true });
storeAccountSchema.index({ isPaused: 1, dueBalance: -1 });
storeAccountSchema.index({ dueBalance: -1 });
const StoreAccount = import_mongoose.default.model(
  "StoreAccount",
  storeAccountSchema
);
var StoreAccount_default = StoreAccount;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  StoreAccount
});
