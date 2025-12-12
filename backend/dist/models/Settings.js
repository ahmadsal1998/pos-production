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
var import_databaseManager = require("../utils/databaseManager");
var import_storeCollections = require("../utils/storeCollections");
const settingsSchema = new import_mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Setting key is required"],
      unique: true,
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
settingsSchema.index({ key: 1 }, { unique: true });
const Settings = import_mongoose.default.model("Settings", settingsSchema);
const storeSettingsModelCache = /* @__PURE__ */ new Map();
async function getStoreSettingsModel(prefix, databaseId) {
  const collectionName = (0, import_storeCollections.getStoreCollectionName)(prefix, "settings");
  const cacheKey = `${databaseId}_${collectionName}`;
  if (storeSettingsModelCache.has(cacheKey)) {
    const cached = storeSettingsModelCache.get(cacheKey);
    if (cached.db.readyState === 1) {
      return cached;
    }
    storeSettingsModelCache.delete(cacheKey);
  }
  const connection = await (0, import_databaseManager.getDatabaseConnection)(databaseId);
  if (connection.models[collectionName]) {
    const model2 = connection.models[collectionName];
    storeSettingsModelCache.set(cacheKey, model2);
    return model2;
  }
  const model = connection.model(collectionName, settingsSchema, collectionName);
  storeSettingsModelCache.set(cacheKey, model);
  return model;
}
var Settings_default = Settings;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getStoreSettingsModel,
  settingsSchema
});
