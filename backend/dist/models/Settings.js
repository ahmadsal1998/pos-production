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
var Settings_exports = {};
__export(Settings_exports, {
  default: () => Settings_default,
  getStoreSettingsModel: () => getStoreSettingsModel,
  settingsSchema: () => settingsSchema
});
module.exports = __toCommonJS(Settings_exports);
var import_mongoose = __toESM(require("mongoose"));
const settingsSchema = new import_mongoose.Schema(
  {
    storeId: {
      type: String,
      required: [true, "Store ID is required"],
      trim: true,
      lowercase: true
      // Index is created via compound indexes below
    },
    key: {
      type: String,
      required: [true, "Setting key is required"],
      trim: true,
      lowercase: true
    },
    value: {
      type: String,
      required: [true, "Setting value is required"],
      trim: true
    },
    description: {
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
settingsSchema.index({ storeId: 1, key: 1 }, { unique: true });
settingsSchema.index({ storeId: 1, createdAt: -1 });
const Settings = import_mongoose.default.model("Settings", settingsSchema);
async function getStoreSettingsModel(prefix, databaseId) {
  return Settings;
}
var Settings_default = Settings;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getStoreSettingsModel,
  settingsSchema
});
