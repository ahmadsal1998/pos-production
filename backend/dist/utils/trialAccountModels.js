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
var trialAccountModels_exports = {};
__export(trialAccountModels_exports, {
  clearTrialStatusCache: () => clearTrialStatusCache,
  getCollectionName: () => getCollectionName,
  getModelForStore: () => getModelForStore,
  isTrialAccount: () => isTrialAccount
});
module.exports = __toCommonJS(trialAccountModels_exports);
var import_mongoose = __toESM(require("mongoose"));
var import_Store = __toESM(require("../models/Store"));
const storeTrialStatusCache = /* @__PURE__ */ new Map();
async function isTrialAccount(storeId) {
  if (!storeId) {
    return false;
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  if (storeTrialStatusCache.has(normalizedStoreId)) {
    return storeTrialStatusCache.get(normalizedStoreId);
  }
  try {
    const store = await import_Store.default.findOne({ storeId: normalizedStoreId }).select("isTrialAccount").lean();
    const isTrial = store?.isTrialAccount || false;
    storeTrialStatusCache.set(normalizedStoreId, isTrial);
    return isTrial;
  } catch (error) {
    console.error(`Error checking trial status for store ${normalizedStoreId}:`, error);
    return false;
  }
}
async function getCollectionName(baseCollectionName, storeId) {
  if (!storeId) {
    return baseCollectionName;
  }
  const isTrial = await isTrialAccount(storeId);
  return isTrial ? `${baseCollectionName}_test` : baseCollectionName;
}
function clearTrialStatusCache(storeId) {
  if (storeId) {
    storeTrialStatusCache.delete(storeId.toLowerCase().trim());
  } else {
    storeTrialStatusCache.clear();
  }
}
async function getModelForStore(baseModel, baseCollectionName, storeId) {
  const collectionName = await getCollectionName(baseCollectionName, storeId);
  if (collectionName !== baseCollectionName) {
    const modelName = `${baseModel.modelName}_${collectionName}`;
    if (import_mongoose.default.models[modelName]) {
      return import_mongoose.default.models[modelName];
    }
    const schema = baseModel.schema;
    return import_mongoose.default.model(modelName, schema, collectionName);
  }
  return baseModel;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  clearTrialStatusCache,
  getCollectionName,
  getModelForStore,
  isTrialAccount
});
