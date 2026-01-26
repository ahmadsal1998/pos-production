"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var storeCollections_exports = {};
__export(storeCollections_exports, {
  collectionExists: () => collectionExists,
  createStoreCollections: () => createStoreCollections,
  ensureCollectionExists: () => ensureCollectionExists,
  getDatabase: () => getDatabase,
  getStoreCollectionName: () => getStoreCollectionName,
  getStoreModel: () => getStoreModel
});
module.exports = __toCommonJS(storeCollections_exports);
var import_databaseManager = require("./databaseManager");
function getStoreCollectionName(prefix, collectionType) {
  console.warn("\u26A0\uFE0F getStoreCollectionName is deprecated. Use unified collections with storeId instead.");
  return `${prefix.toLowerCase()}_${collectionType}`;
}
async function getStoreModel(prefix, collectionType, schema, databaseId) {
  console.warn("\u26A0\uFE0F getStoreModel is deprecated. Use unified models directly from ../models/");
  throw new Error("getStoreModel is deprecated. Use unified models with storeId instead.");
}
async function getDatabase(databaseId) {
  const connection = await (0, import_databaseManager.getDatabaseConnection)(databaseId);
  return connection.db;
}
async function collectionExists(prefix, collectionType, databaseId) {
  console.warn("\u26A0\uFE0F collectionExists is deprecated. Collections are now unified with storeId.");
  return false;
}
async function ensureCollectionExists(prefix, collectionType, databaseId) {
  console.warn("\u26A0\uFE0F ensureCollectionExists is deprecated. Collections are created automatically by Mongoose.");
}
async function createStoreCollections(prefix, databaseId, storeId) {
  console.warn("\u26A0\uFE0F createStoreCollections is deprecated. All collections are now unified with storeId and created automatically by Mongoose.");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  collectionExists,
  createStoreCollections,
  ensureCollectionExists,
  getDatabase,
  getStoreCollectionName,
  getStoreModel
});
