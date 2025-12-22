"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var import_mongoose = __toESM(require("mongoose"));
var import_database = __toESM(require("../config/database"));
var import_purgeTrialAccounts = require("../utils/purgeTrialAccounts");
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--confirm");
  const storeIdArg = args.find((arg) => arg.startsWith("--store-id="));
  const storeId = storeIdArg ? storeIdArg.split("=")[1] : null;
  try {
    console.log("\u{1F517} Connecting to database...");
    await (0, import_database.default)();
    console.log("\u2705 Connected\n");
    if (storeId) {
      console.log(`\u{1F4CB} Generating purge report for store: ${storeId}...
`);
      const result = await (0, import_purgeTrialAccounts.purgeSpecificTrialAccount)(storeId, dryRun, !dryRun);
      if (dryRun) {
        console.log("=== DRY RUN REPORT ===\n");
        console.log(`Store: ${result.store.name} (${result.store.storeId})`);
        console.log(`Created: ${result.store.createdAt}`);
        console.log(`
Documents to delete:`);
        Object.entries(result.deleted.documents).forEach(([collection, count]) => {
          if (count > 0) {
            console.log(`  - ${collection}: ${count} documents`);
          }
        });
        console.log(`
Users to delete: ${result.deleted.users}`);
        console.log("\n\u26A0\uFE0F  This is a DRY RUN. Use --confirm to actually delete.\n");
      } else {
        console.log("\u2705 Purge completed successfully!\n");
      }
    } else {
      console.log("\u{1F4CB} Generating purge report...\n");
      const result = await (0, import_purgeTrialAccounts.purgeTrialAccounts)(dryRun, !dryRun);
      if (dryRun) {
        console.log("=== DRY RUN REPORT ===\n");
        console.log(`Trial accounts found: ${result.report.storesFound}`);
        console.log(`
Stores to delete:`);
        result.report.storesToDelete.forEach((store) => {
          console.log(`  - ${store.name} (${store.storeId})`);
          console.log(`    Created: ${store.createdAt}`);
          console.log(`    Users: ${store.userCount}`);
        });
        console.log(`
Test collections to purge:`);
        Object.entries(result.report.totalDocumentsToDelete).forEach(([collection, count]) => {
          if (count > 0) {
            console.log(`  - ${collection}: ${count} documents`);
          }
        });
        console.log(`
Estimated size: ${result.report.estimatedSize}`);
        console.log("\n\u26A0\uFE0F  This is a DRY RUN. Use --confirm to actually delete.\n");
      } else {
        console.log("\u2705 Purge completed successfully!\n");
        if (result.errors.length > 0) {
          console.log("Errors encountered:");
          result.errors.forEach((error) => console.log(`  - ${error}`));
        }
      }
    }
    await import_mongoose.default.connection.close();
    console.log("\u{1F44B} Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("\n\u274C Error:", error.message);
    if (error.message.includes("cancelled") || error.message.includes("DRY RUN")) {
      console.log("\n\u{1F4A1} Tip: This was a safety check. Use --confirm to proceed with deletion.\n");
    }
    await import_mongoose.default.connection.close();
    process.exit(1);
  }
}
main();
