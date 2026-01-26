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
var PointsSettings_exports = {};
__export(PointsSettings_exports, {
  PointsSettings: () => PointsSettings,
  default: () => PointsSettings_default
});
module.exports = __toCommonJS(PointsSettings_exports);
var import_mongoose = __toESM(require("mongoose"));
const pointsSettingsSchema = new import_mongoose.Schema(
  {
    storeId: {
      type: String,
      default: "global",
      // Global settings by default
      trim: true,
      lowercase: true
    },
    userPointsPercentage: {
      type: Number,
      required: [true, "User points percentage is required"],
      default: 5,
      // Default 5%
      min: 0,
      max: 100
    },
    companyProfitPercentage: {
      type: Number,
      required: [true, "Company profit percentage is required"],
      default: 2,
      // Default 2%
      min: 0,
      max: 100
    },
    defaultThreshold: {
      type: Number,
      required: [true, "Default threshold is required"],
      default: 1e4,
      // Default threshold of 10,000
      min: 0
    },
    pointsExpirationDays: {
      type: Number,
      min: 1
    },
    minPurchaseAmount: {
      type: Number,
      min: 0
    },
    maxPointsPerTransaction: {
      type: Number,
      min: 0
    },
    pointsValuePerPoint: {
      type: Number,
      default: 0.01,
      // Default: 1 point = $0.01
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
pointsSettingsSchema.index({ storeId: 1 }, { unique: true });
const PointsSettings = import_mongoose.default.model(
  "PointsSettings",
  pointsSettingsSchema
);
var PointsSettings_default = PointsSettings;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PointsSettings
});
