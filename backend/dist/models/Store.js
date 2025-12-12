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
var Store_exports = {};
__export(Store_exports, {
  default: () => Store_default
});
module.exports = __toCommonJS(Store_exports);
var import_mongoose = __toESM(require("mongoose"));
const terminalSchema = new import_mongoose.Schema(
  {
    terminalId: {
      type: String,
      required: [true, "Terminal ID (TID) is required"],
      trim: true,
      uppercase: true
    },
    merchantIdMid: {
      type: String,
      required: [true, "Merchant ID (MID) is required"],
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: [true, "Terminal name is required"],
      trim: true
    },
    host: {
      type: String,
      required: [true, "Terminal host/IP is required"],
      trim: true,
      validate: {
        validator: function(v) {
          return /^([0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-zA-Z0-9.-]+$/.test(v);
        },
        message: "Invalid host/IP address format"
      }
    },
    port: {
      type: Number,
      required: [true, "Port is required"],
      default: 12e3,
      min: [1, "Port must be between 1 and 65535"],
      max: [65535, "Port must be between 1 and 65535"]
    },
    connectionType: {
      type: String,
      enum: ["ethernet", "usb", "serial"],
      required: [true, "Connection type is required"],
      default: "ethernet"
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Maintenance"],
      default: "Active"
    },
    testMode: {
      type: Boolean,
      default: false
    },
    timeout: {
      type: Number,
      default: 6e4,
      // 60 seconds
      min: [1e3, "Timeout must be at least 1000ms"]
    },
    description: {
      type: String,
      trim: true
    },
    lastConnected: {
      type: Date
    },
    lastError: {
      type: String
    }
  },
  {
    timestamps: true,
    _id: true
    // Enable _id for terminal subdocuments
  }
);
const storeSchema = new import_mongoose.Schema(
  {
    storeNumber: {
      type: Number,
      required: [true, "Store number is required"],
      unique: true,
      min: [1, "Store number must be at least 1"]
    },
    storeId: {
      type: String,
      required: [true, "Store ID is required"],
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      required: [true, "Store name is required"],
      trim: true
    },
    prefix: {
      type: String,
      required: [true, "Store prefix is required"],
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9_]+$/, "Prefix must contain only lowercase letters, numbers, and underscores"]
    },
    databaseId: {
      type: Number,
      required: [true, "Database ID is required"],
      min: 1,
      max: 5
      // Based on DATABASE_CONFIG.DATABASE_COUNT
    },
    terminals: {
      type: [terminalSchema],
      default: []
    },
    subscriptionStartDate: {
      type: Date,
      default: Date.now
    },
    subscriptionEndDate: {
      type: Date,
      default: function() {
        const date = /* @__PURE__ */ new Date();
        date.setFullYear(date.getFullYear() + 1);
        return date;
      }
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    // Contact information
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"]
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    country: {
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
        if (ret.terminals && Array.isArray(ret.terminals)) {
          ret.terminals = ret.terminals.map((term) => {
            if (term._id) {
              term.id = term._id;
              delete term._id;
            }
            return term;
          });
        }
        return ret;
      }
    }
  }
);
storeSchema.index({ storeNumber: 1 }, { unique: true });
storeSchema.index({ storeId: 1 });
storeSchema.index({ prefix: 1 });
storeSchema.index({ databaseId: 1 });
const Store = import_mongoose.default.model("Store", storeSchema);
var Store_default = Store;
