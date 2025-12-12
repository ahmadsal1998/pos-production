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
var migrateStores_exports = {};
__export(migrateStores_exports, {
  default: () => migrateStores_default
});
module.exports = __toCommonJS(migrateStores_exports);
var import_mongoose = __toESM(require("mongoose"));
var import_dotenv = __toESM(require("dotenv"));
var import_Store = __toESM(require("../models/Store"));
var import_databaseManager = require("./databaseManager");
var import_database = require("../config/database");
import_dotenv.default.config();
const migrateExistingStores = async () => {
  try {
    console.log("\u{1F504} Starting store migration...\n");
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    const uriWithAdminDb = (0, import_database.ensureAdminDatabase)(mongoUri);
    await import_mongoose.default.connect(uriWithAdminDb);
    console.log("\u2705 Connected to main database\n");
    const allStores = await import_Store.default.find({}).sort({ createdAt: 1 });
    console.log(`\u{1F4CA} Found ${allStores.length} total stores
`);
    const storesWithoutDb = allStores.filter((store) => !store.databaseId);
    const storesWithDb = allStores.filter((store) => store.databaseId);
    console.log(`\u{1F4CB} Stores without databaseId: ${storesWithoutDb.length}`);
    console.log(`\u2705 Stores with databaseId: ${storesWithDb.length}
`);
    if (storesWithoutDb.length === 0) {
      console.log("\u2705 All stores already have databaseId assigned. No migration needed.");
      await import_mongoose.default.disconnect();
      return;
    }
    const storesPerDatabase = {};
    for (let i = 1; i <= import_databaseManager.DATABASE_CONFIG.DATABASE_COUNT; i++) {
      storesPerDatabase[i] = storesWithDb.filter((s) => s.databaseId === i).length;
    }
    console.log("\u{1F4CA} Current distribution:");
    Object.entries(storesPerDatabase).forEach(([dbId, count]) => {
      console.log(`   Database ${dbId}: ${count} stores`);
    });
    console.log("");
    let assignedCount = 0;
    for (const store of storesWithoutDb) {
      let targetDatabase = 1;
      let minCount = storesPerDatabase[1];
      for (let dbId = 2; dbId <= import_databaseManager.DATABASE_CONFIG.DATABASE_COUNT; dbId++) {
        if (storesPerDatabase[dbId] < minCount) {
          minCount = storesPerDatabase[dbId];
          targetDatabase = dbId;
        }
      }
      store.databaseId = targetDatabase;
      await store.save();
      storesPerDatabase[targetDatabase]++;
      assignedCount++;
      console.log(`\u2705 Store "${store.name}" (${store.prefix}) \u2192 Database ${targetDatabase}`);
      if (assignedCount % 10 === 0) {
        console.log(`   Progress: ${assignedCount}/${storesWithoutDb.length} stores migrated
`);
      }
    }
    console.log(`
\u2705 Migration completed!`);
    console.log(`   Migrated ${assignedCount} stores
`);
    console.log("\u{1F4CA} Final distribution:");
    Object.entries(storesPerDatabase).forEach(([dbId, count]) => {
      console.log(`   Database ${dbId}: ${count} stores`);
    });
    const remaining = await import_Store.default.countDocuments({ databaseId: { $exists: false } });
    if (remaining > 0) {
      console.log(`
\u26A0\uFE0F  Warning: ${remaining} stores still without databaseId`);
    } else {
      console.log(`
\u2705 All stores have databaseId assigned`);
    }
    await import_mongoose.default.disconnect();
    console.log("\n\u2705 Disconnected from database");
  } catch (error) {
    console.error("\n\u274C Migration error:", error.message);
    console.error(error.stack);
    await import_mongoose.default.disconnect();
    process.exit(1);
  }
};
if (require.main === module) {
  migrateExistingStores().then(() => {
    console.log("\n\u2705 Migration script completed successfully");
    process.exit(0);
  }).catch((error) => {
    console.error("\n\u274C Migration script failed:", error);
    process.exit(1);
  });
}
var migrateStores_default = migrateExistingStores;
