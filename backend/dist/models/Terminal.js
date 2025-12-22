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
var Terminal_exports = {};
__export(Terminal_exports, {
  Terminal: () => Terminal
});
module.exports = __toCommonJS(Terminal_exports);
var import_mongoose = __toESM(require("mongoose"));
const terminalSchema = new import_mongoose.Schema(
  {
    merchantId: {
      type: import_mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: false,
      index: true,
      default: null
    },
    storeId: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: null
    },
    merchantIdMid: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
      default: null
    },
    terminalId: {
      type: String,
      required: [true, "Terminal ID (TID) is required"],
      trim: true,
      uppercase: true,
      index: true
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
      default: "Active",
      index: true
    },
    testMode: {
      type: Boolean,
      default: false,
      index: true
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
terminalSchema.pre("save", async function(next) {
  const terminal = this;
  if (terminal.merchantId) {
    return next();
  }
  if (!terminal.storeId || !terminal.merchantIdMid) {
    return next(new Error("Either merchantId OR (storeId + merchantIdMid) must be provided"));
  }
  next();
});
terminalSchema.index({ merchantId: 1, terminalId: 1 }, {
  unique: true,
  partialFilterExpression: { merchantId: { $ne: null } }
});
terminalSchema.index({ storeId: 1, terminalId: 1 }, {
  unique: true,
  partialFilterExpression: { storeId: { $ne: null } }
});
terminalSchema.index({ status: 1, testMode: 1 });
terminalSchema.index({ merchantId: 1, status: 1 });
terminalSchema.index({ storeId: 1, status: 1 });
const Terminal = import_mongoose.default.model("Terminal", terminalSchema);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Terminal
});
