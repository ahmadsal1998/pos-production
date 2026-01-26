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
var GlobalCustomer_exports = {};
__export(GlobalCustomer_exports, {
  GlobalCustomer: () => GlobalCustomer,
  default: () => GlobalCustomer_default
});
module.exports = __toCommonJS(GlobalCustomer_exports);
var import_mongoose = __toESM(require("mongoose"));
const globalCustomerStoreSchema = new import_mongoose.Schema(
  {
    storeId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    customerId: {
      type: String,
      required: true,
      trim: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);
const globalCustomerSchema = new import_mongoose.Schema(
  {
    globalCustomerId: {
      type: String,
      required: [true, "Global customer ID is required"],
      trim: true,
      lowercase: true
    },
    identifierType: {
      type: String,
      enum: ["phone", "email"],
      required: [true, "Identifier type is required"]
    },
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    stores: {
      type: [globalCustomerStoreSchema],
      default: []
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
globalCustomerSchema.index({ globalCustomerId: 1 }, { unique: true });
globalCustomerSchema.index({ phone: 1 });
globalCustomerSchema.index({ email: 1 });
globalCustomerSchema.index({ "stores.storeId": 1 });
globalCustomerSchema.statics.getOrCreateGlobalCustomer = async function(storeId, customerId, customerName, phone, email) {
  const identifier = phone || email;
  if (!identifier) {
    throw new Error("Either phone or email is required to create global customer");
  }
  const identifierType = phone ? "phone" : "email";
  const globalCustomerId = identifier.toLowerCase().trim();
  let globalCustomer = await this.findOne({ globalCustomerId });
  if (globalCustomer) {
    const storeExists = globalCustomer.stores.some(
      (s) => s.storeId === storeId.toLowerCase()
    );
    if (!storeExists) {
      globalCustomer.stores.push({
        storeId: storeId.toLowerCase(),
        customerId,
        customerName,
        registeredAt: /* @__PURE__ */ new Date()
      });
      await globalCustomer.save();
    }
  } else {
    globalCustomer = await this.create({
      globalCustomerId,
      identifierType,
      name: customerName,
      phone: phone?.trim().toLowerCase(),
      email: email?.trim().toLowerCase(),
      stores: [
        {
          storeId: storeId.toLowerCase(),
          customerId,
          customerName,
          registeredAt: /* @__PURE__ */ new Date()
        }
      ]
    });
  }
  return globalCustomer;
};
const GlobalCustomer = import_mongoose.default.model(
  "GlobalCustomer",
  globalCustomerSchema
);
var GlobalCustomer_default = GlobalCustomer;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GlobalCustomer
});
