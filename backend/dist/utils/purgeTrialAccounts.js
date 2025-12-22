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
var purgeTrialAccounts_exports = {};
__export(purgeTrialAccounts_exports, {
  generatePurgeReport: () => generatePurgeReport,
  getTrialAccounts: () => getTrialAccounts,
  purgeSpecificTrialAccount: () => purgeSpecificTrialAccount,
  purgeTrialAccounts: () => purgeTrialAccounts
});
module.exports = __toCommonJS(purgeTrialAccounts_exports);
var import_mongoose = __toESM(require("mongoose"));
var import_Store = __toESM(require("../models/Store"));
var import_User = __toESM(require("../models/User"));
const TEST_COLLECTIONS = [
  "products_test",
  "customers_test",
  "sales_test",
  "categories_test",
  "brands_test",
  "warehouses_test",
  "units_test",
  "payments_test",
  "settings_test",
  "merchants_test"
];
async function getTrialAccounts() {
  return await import_Store.default.find({ isTrialAccount: true }).lean();
}
async function getTestCollectionCounts(db, storeIds) {
  const counts = {};
  if (storeIds.length === 0) {
    TEST_COLLECTIONS.forEach((collectionName) => {
      counts[collectionName] = 0;
    });
    return counts;
  }
  const normalizedStoreIds = storeIds.map((id) => id.toLowerCase());
  for (const collectionName of TEST_COLLECTIONS) {
    try {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments({
        storeId: { $in: normalizedStoreIds }
      });
      counts[collectionName] = count;
    } catch (error) {
      counts[collectionName] = 0;
    }
  }
  return counts;
}
async function getTrialAccountUsers(trialStoreIds) {
  if (trialStoreIds.length === 0) return [];
  return await import_User.default.find({
    storeId: { $in: trialStoreIds.map((id) => id.toLowerCase()) }
  }).lean();
}
async function generatePurgeReport() {
  const db = import_mongoose.default.connection.db;
  if (!db) {
    throw new Error("Database connection not available");
  }
  const trialStores = await getTrialAccounts();
  const trialStoreIds = trialStores.map((store) => store.storeId.toLowerCase());
  const trialUsers = await getTrialAccountUsers(trialStoreIds);
  const collectionCounts = await getTestCollectionCounts(db, trialStoreIds);
  const totalDocuments = Object.values(collectionCounts).reduce((sum, count) => sum + count, 0);
  const userCount = trialUsers.length;
  const storeCount = trialStores.length;
  const estimatedSizeMB = (totalDocuments + userCount + storeCount) * 1e-3;
  return {
    storesFound: storeCount,
    storesToDelete: trialStores.map((store) => ({
      id: store._id.toString(),
      storeId: store.storeId,
      name: store.name,
      createdAt: store.createdAt,
      userCount: trialUsers.filter((u) => u.storeId?.toLowerCase() === store.storeId.toLowerCase()).length
    })),
    collectionsToPurge: TEST_COLLECTIONS,
    totalDocumentsToDelete: collectionCounts,
    estimatedSize: `${estimatedSizeMB.toFixed(2)} MB`
  };
}
async function purgeTrialAccounts(dryRun = true, confirm = false) {
  const db = import_mongoose.default.connection.db;
  if (!db) {
    throw new Error("Database connection not available");
  }
  const report = await generatePurgeReport();
  const errors = [];
  const deleted = {
    stores: 0,
    users: 0,
    collections: {}
  };
  if (dryRun) {
    console.log("\n=== DRY RUN MODE - No data will be deleted ===\n");
    return {
      success: true,
      report,
      deleted,
      errors: []
    };
  }
  if (report.storesFound === 0) {
    console.log("No trial accounts found. Nothing to purge.");
    return {
      success: true,
      report,
      deleted,
      errors: []
    };
  }
  if (!confirm) {
    console.log("\n\u26A0\uFE0F  WARNING: This will permanently delete:");
    console.log(`   - ${report.storesFound} trial store(s)`);
    console.log(`   - ${report.storesToDelete.reduce((sum, s) => sum + s.userCount, 0)} user(s)`);
    console.log(`   - All documents in ${TEST_COLLECTIONS.length} test collections`);
    console.log(`   - Estimated size: ${report.estimatedSize}`);
    console.log("\nThis action CANNOT be undone!\n");
    throw new Error("Purge cancelled. Set confirm=true to proceed.");
  }
  console.log("\n\u{1F680} Starting trial account purge...\n");
  const trialStoreIds = report.storesToDelete.map((s) => s.storeId.toLowerCase());
  console.log("\u{1F4E6} Purging ALL store data from test collections...");
  for (const collectionName of TEST_COLLECTIONS) {
    try {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments({
        storeId: { $in: trialStoreIds }
      });
      if (count > 0) {
        const result = await collection.deleteMany({
          storeId: { $in: trialStoreIds }
        });
        deleted.collections[collectionName] = result.deletedCount || 0;
        console.log(`   \u2713 ${collectionName}: ${deleted.collections[collectionName]} documents deleted`);
      } else {
        deleted.collections[collectionName] = 0;
        console.log(`   - ${collectionName}: no documents found for trial stores (skipped)`);
      }
    } catch (error) {
      const errorMsg = `Error purging ${collectionName}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`   \u2717 ${errorMsg}`);
    }
  }
  console.log("\n\u2699\uFE0F  Checking regular settings collection for trial stores...");
  try {
    const settingsCollection = db.collection("settings");
    const settingsCount = await settingsCollection.countDocuments({
      storeId: { $in: trialStoreIds }
    });
    if (settingsCount > 0) {
      const settingsResult = await settingsCollection.deleteMany({
        storeId: { $in: trialStoreIds }
      });
      deleted.collections["settings"] = settingsResult.deletedCount || 0;
      console.log(`   \u2713 settings: ${deleted.collections["settings"]} documents deleted`);
    } else {
      console.log("   - settings: no documents found for trial stores (skipped)");
    }
  } catch (error) {
    console.log("   - settings: skipped (may not exist or already in test collection)");
  }
  console.log("\n\u{1F465} Deleting associated users...");
  if (trialStoreIds.length > 0) {
    try {
      const deleteResult = await import_User.default.deleteMany({
        storeId: { $in: trialStoreIds }
      });
      deleted.users = deleteResult.deletedCount || 0;
      console.log(`   \u2713 ${deleted.users} user(s) deleted`);
    } catch (error) {
      const errorMsg = `Error deleting users: ${error.message}`;
      errors.push(errorMsg);
      console.error(`   \u2717 ${errorMsg}`);
    }
  }
  console.log("\n\u{1F3EA} Deleting trial store records...");
  try {
    const deleteResult = await import_Store.default.deleteMany({ isTrialAccount: true });
    deleted.stores = deleteResult.deletedCount || 0;
    console.log(`   \u2713 ${deleted.stores} store(s) deleted`);
  } catch (error) {
    const errorMsg = `Error deleting stores: ${error.message}`;
    errors.push(errorMsg);
    console.error(`   \u2717 ${errorMsg}`);
  }
  try {
    const { clearTrialStatusCache } = await import("./trialAccountModels");
    clearTrialStatusCache();
    console.log("   \u2713 Trial status cache cleared");
  } catch (error) {
  }
  console.log("\n\u2705 Purge completed!\n");
  console.log("Summary:");
  console.log(`   - Stores deleted: ${deleted.stores}`);
  console.log(`   - Users deleted: ${deleted.users}`);
  console.log(`   - Collections purged: ${Object.keys(deleted.collections).length}`);
  if (errors.length > 0) {
    console.log(`   - Errors: ${errors.length}`);
  }
  return {
    success: errors.length === 0,
    report,
    deleted,
    errors
  };
}
async function purgeSpecificTrialAccount(storeId, dryRun = true, confirm = false) {
  const db = import_mongoose.default.connection.db;
  if (!db) {
    throw new Error("Database connection not available");
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const errors = [];
  const deleted = {
    users: 0,
    documents: {}
  };
  const store = await import_Store.default.findOne({
    storeId: normalizedStoreId,
    isTrialAccount: true
  }).lean();
  if (!store) {
    throw new Error(`Trial account with storeId "${storeId}" not found`);
  }
  if (dryRun) {
    for (const collectionName of TEST_COLLECTIONS) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments({
          storeId: normalizedStoreId
        });
        deleted.documents[collectionName] = count;
      } catch (error) {
        deleted.documents[collectionName] = 0;
      }
    }
    const userCount = await import_User.default.countDocuments({
      storeId: normalizedStoreId
    });
    deleted.users = userCount;
    return {
      success: true,
      store,
      deleted,
      errors: []
    };
  }
  if (!confirm) {
    throw new Error("Purge cancelled. Set confirm=true to proceed.");
  }
  console.log(`
\u{1F680} Purging trial account: ${store.name} (${storeId})
`);
  console.log("\u{1F4E6} Deleting all store data from test collections...");
  for (const collectionName of TEST_COLLECTIONS) {
    try {
      const collection = db.collection(collectionName);
      const result = await collection.deleteMany({
        storeId: normalizedStoreId
      });
      deleted.documents[collectionName] = result.deletedCount || 0;
      if (deleted.documents[collectionName] > 0) {
        console.log(`   \u2713 ${collectionName}: ${deleted.documents[collectionName]} documents deleted`);
      } else {
        console.log(`   - ${collectionName}: no documents found (skipped)`);
      }
    } catch (error) {
      const errorMsg = `Error purging ${collectionName}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`   \u2717 ${errorMsg}`);
    }
  }
  console.log("\n\u{1F465} Deleting all users associated with this store...");
  try {
    const deleteResult = await import_User.default.deleteMany({
      storeId: normalizedStoreId
    });
    deleted.users = deleteResult.deletedCount || 0;
    console.log(`   \u2713 ${deleted.users} user(s) deleted`);
  } catch (error) {
    const errorMsg = `Error deleting users: ${error.message}`;
    errors.push(errorMsg);
    console.error(`   \u2717 ${errorMsg}`);
  }
  console.log("\n\u2699\uFE0F  Checking regular settings collection...");
  try {
    const settingsCollection = db.collection("settings");
    const settingsResult = await settingsCollection.deleteMany({
      storeId: normalizedStoreId
    });
    if (settingsResult.deletedCount > 0) {
      console.log(`   \u2713 settings: ${settingsResult.deletedCount} documents deleted`);
      deleted.documents["settings"] = settingsResult.deletedCount;
    }
  } catch (error) {
    console.log("   - settings: skipped (may not exist or already in test collection)");
  }
  console.log("\n\u{1F3EA} Deleting store record...");
  try {
    await import_Store.default.deleteOne({ _id: store._id });
    console.log(`   \u2713 Store record deleted`);
  } catch (error) {
    const errorMsg = `Error deleting store: ${error.message}`;
    errors.push(errorMsg);
    console.error(`   \u2717 ${errorMsg}`);
  }
  try {
    const { clearTrialStatusCache } = await import("./trialAccountModels");
    clearTrialStatusCache(normalizedStoreId);
    console.log("   \u2713 Trial status cache cleared");
  } catch (error) {
  }
  console.log("\n\u2705 Purge completed!");
  console.log("\nSummary:");
  console.log(`   - Store: ${store.name} (${storeId})`);
  console.log(`   - Users deleted: ${deleted.users}`);
  console.log(`   - Collections purged: ${Object.keys(deleted.documents).length}`);
  Object.entries(deleted.documents).forEach(([collection, count]) => {
    if (count > 0) {
      console.log(`     \u2022 ${collection}: ${count} documents`);
    }
  });
  if (errors.length > 0) {
    console.log(`   - Errors: ${errors.length}`);
  }
  console.log("");
  return {
    success: errors.length === 0,
    store,
    deleted,
    errors
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generatePurgeReport,
  getTrialAccounts,
  purgeSpecificTrialAccount,
  purgeTrialAccounts
});
