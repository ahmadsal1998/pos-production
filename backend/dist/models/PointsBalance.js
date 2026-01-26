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
var PointsBalance_exports = {};
__export(PointsBalance_exports, {
  PointsBalance: () => PointsBalance,
  default: () => PointsBalance_default
});
module.exports = __toCommonJS(PointsBalance_exports);
var import_mongoose = __toESM(require("mongoose"));
const pointsBalanceSchema = new import_mongoose.Schema(
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
    customerPhone: {
      type: String,
      trim: true
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    totalPoints: {
      type: Number,
      default: 0,
      min: 0
    },
    availablePoints: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingPoints: {
      type: Number,
      default: 0,
      min: 0
    },
    lifetimeEarned: {
      type: Number,
      default: 0,
      min: 0
    },
    lifetimeSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    lastTransactionDate: {
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
pointsBalanceSchema.index({ globalCustomerId: 1 }, { unique: true });
pointsBalanceSchema.index({ customerPhone: 1 });
pointsBalanceSchema.index({ customerEmail: 1 });
pointsBalanceSchema.index({ totalPoints: -1 });
pointsBalanceSchema.index({ createdAt: -1 });
const PointsBalance = import_mongoose.default.model(
  "PointsBalance",
  pointsBalanceSchema
);
var PointsBalance_default = PointsBalance;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PointsBalance
});
