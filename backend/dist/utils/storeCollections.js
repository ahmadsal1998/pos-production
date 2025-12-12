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
  return `${prefix.toLowerCase()}_${collectionType}`;
}
async function getStoreModel(prefix, collectionType, schema, databaseId) {
  const collectionName = getStoreCollectionName(prefix, collectionType);
  const dbName = (0, import_databaseManager.getDatabaseName)(databaseId);
  const modelKey = `${dbName}_${collectionName}`;
  const connection = await (0, import_databaseManager.getDatabaseConnection)(databaseId);
  if (connection.models[collectionName]) {
    return connection.models[collectionName];
  }
  return connection.model(collectionName, schema, collectionName);
}
async function getDatabase(databaseId) {
  const connection = await (0, import_databaseManager.getDatabaseConnection)(databaseId);
  return connection.db;
}
async function collectionExists(prefix, collectionType, databaseId) {
  const db = await getDatabase(databaseId);
  if (!db) {
    return false;
  }
  const collectionName = getStoreCollectionName(prefix, collectionType);
  const collections = await db.listCollections({ name: collectionName }).toArray();
  return collections.length > 0;
}
async function ensureCollectionExists(prefix, collectionType, databaseId) {
  const db = await getDatabase(databaseId);
  if (!db) {
    throw new Error(`Database connection not available for database ${databaseId}`);
  }
  const collectionName = getStoreCollectionName(prefix, collectionType);
  const exists = await collectionExists(prefix, collectionType, databaseId);
  if (!exists) {
    await db.createCollection(collectionName);
    const dbName = (0, import_databaseManager.getDatabaseName)(databaseId);
    console.log(`\u2705 Created collection: ${collectionName} in database ${dbName}`);
  }
}
async function createStoreCollections(prefix, databaseId, storeId) {
  const prefixCollections = ["products", "orders", "categories", "customers", "settings"];
  for (const collectionType of prefixCollections) {
    try {
      await ensureCollectionExists(prefix, collectionType, databaseId);
    } catch (error) {
      console.error(`\u274C Error creating collection ${collectionType} for store ${prefix}:`, error.message);
    }
  }
  if (storeId) {
    try {
      const usersCollectionName = `${storeId.toLowerCase()}_users`;
      const db = await getDatabase(databaseId);
      const collections = await db.listCollections({ name: usersCollectionName }).toArray();
      const exists = collections.length > 0;
      if (!exists) {
        await db.createCollection(usersCollectionName);
        const dbName2 = (0, import_databaseManager.getDatabaseName)(databaseId);
        console.log(`\u2705 Created collection: ${usersCollectionName} in database ${dbName2}`);
      }
    } catch (error) {
      console.error(`\u274C Error creating users collection for store ${storeId}:`, error.message);
    }
  }
  const dbName = (0, import_databaseManager.getDatabaseName)(databaseId);
  console.log(`\u2705 All collections created for store ${prefix} in database ${dbName}`);
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
