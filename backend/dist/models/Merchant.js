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
var Merchant_exports = {};
__export(Merchant_exports, {
  Merchant: () => Merchant
});
module.exports = __toCommonJS(Merchant_exports);
var import_mongoose = __toESM(require("mongoose"));
const merchantSchema = new import_mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Merchant name is required"],
      trim: true
    },
    merchantId: {
      type: String,
      required: [true, "Merchant ID (MID) is required"],
      unique: true,
      trim: true,
      uppercase: true
    },
    storeId: {
      type: String,
      default: null
      // Index is created via compound index below
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    },
    description: {
      type: String,
      trim: true
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
merchantSchema.index({ storeId: 1, status: 1 });
const Merchant = import_mongoose.default.model("Merchant", merchantSchema);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Merchant
});
