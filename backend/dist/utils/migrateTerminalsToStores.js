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
var migrateTerminalsToStores_exports = {};
__export(migrateTerminalsToStores_exports, {
  migrateTerminalsToStores: () => migrateTerminalsToStores
});
module.exports = __toCommonJS(migrateTerminalsToStores_exports);
var import_mongoose = __toESM(require("mongoose"));
var import_Store = __toESM(require("../models/Store"));
var import_Terminal = require("../models/Terminal");
async function migrateTerminalsToStores(dryRun = true) {
  console.log("\u{1F680} Starting terminal migration to stores...");
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes will be saved)" : "LIVE (changes will be saved)"}
`);
  try {
    const terminals = await import_Terminal.Terminal.find({});
    console.log(`Found ${terminals.length} terminal(s) to migrate
`);
    if (terminals.length === 0) {
      console.log("\u2705 No terminals to migrate. Exiting.");
      return;
    }
    const migrationResults = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    for (const terminal of terminals) {
      try {
        let storeId = null;
        if (terminal.storeId) {
          storeId = terminal.storeId.toLowerCase();
        } else if (terminal.merchantId) {
          const { Merchant } = await import("../models/Merchant");
          const merchant = await Merchant.findById(terminal.merchantId);
          if (merchant && merchant.storeId) {
            storeId = merchant.storeId.toLowerCase();
          }
        }
        if (!storeId) {
          console.log(`\u26A0\uFE0F  Skipping terminal ${terminal.terminalId} (ID: ${terminal._id}): No store ID found`);
          migrationResults.skipped++;
          continue;
        }
        const store = await import_Store.default.findOne({ storeId });
        if (!store) {
          console.log(`\u26A0\uFE0F  Skipping terminal ${terminal.terminalId} (ID: ${terminal._id}): Store '${storeId}' not found`);
          migrationResults.skipped++;
          migrationResults.errors.push({
            terminalId: terminal.terminalId,
            error: `Store '${storeId}' not found`
          });
          continue;
        }
        if (store.terminals && store.terminals.length > 0) {
          const existing = store.terminals.find(
            (t) => t.terminalId.toUpperCase() === terminal.terminalId.toUpperCase()
          );
          if (existing) {
            console.log(`\u26A0\uFE0F  Skipping terminal ${terminal.terminalId} (ID: ${terminal._id}): Already exists in store '${storeId}'`);
            migrationResults.skipped++;
            continue;
          }
        }
        const storeTerminal = {
          terminalId: terminal.terminalId,
          merchantIdMid: terminal.merchantIdMid || terminal.terminalId,
          // Use terminalId as fallback if no MID
          name: terminal.name,
          host: terminal.host,
          port: terminal.port,
          connectionType: terminal.connectionType,
          status: terminal.status,
          testMode: terminal.testMode,
          timeout: terminal.timeout,
          description: terminal.description,
          lastConnected: terminal.lastConnected,
          lastError: terminal.lastError,
          createdAt: terminal.createdAt,
          updatedAt: terminal.updatedAt
        };
        if (!store.terminals) {
          store.terminals = [];
        }
        store.terminals.push(storeTerminal);
        if (!dryRun) {
          await store.save();
          console.log(`\u2705 Migrated terminal ${terminal.terminalId} (ID: ${terminal._id}) to store '${storeId}'`);
        } else {
          console.log(`[DRY RUN] Would migrate terminal ${terminal.terminalId} (ID: ${terminal._id}) to store '${storeId}'`);
        }
        migrationResults.success++;
      } catch (error) {
        console.error(`\u274C Error migrating terminal ${terminal.terminalId} (ID: ${terminal._id}):`, error.message);
        migrationResults.failed++;
        migrationResults.errors.push({
          terminalId: terminal.terminalId,
          error: error.message
        });
      }
    }
    console.log("\n\u{1F4CA} Migration Summary:");
    console.log(`  \u2705 Success: ${migrationResults.success}`);
    console.log(`  \u26A0\uFE0F  Skipped: ${migrationResults.skipped}`);
    console.log(`  \u274C Failed: ${migrationResults.failed}`);
    if (migrationResults.errors.length > 0) {
      console.log("\n\u274C Errors:");
      migrationResults.errors.forEach((err) => {
        console.log(`  - Terminal ${err.terminalId}: ${err.error}`);
      });
    }
    if (dryRun) {
      console.log("\n\u26A0\uFE0F  This was a DRY RUN. No changes were saved.");
      console.log("   Run with dryRun=false to apply changes.");
    } else {
      console.log("\n\u2705 Migration completed!");
    }
  } catch (error) {
    console.error("\u274C Migration failed:", error);
    throw error;
  }
}
if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/pos-production";
  import_mongoose.default.connect(mongoUri).then(() => {
    console.log("\u2705 Connected to MongoDB");
    const dryRun = process.env.DRY_RUN !== "false";
    return migrateTerminalsToStores(dryRun);
  }).then(() => {
    console.log("\n\u2705 Migration script completed");
    process.exit(0);
  }).catch((error) => {
    console.error("\u274C Migration script failed:", error);
    process.exit(1);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  migrateTerminalsToStores
});
