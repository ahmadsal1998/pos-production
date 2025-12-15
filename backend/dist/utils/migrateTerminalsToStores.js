"use strict";
/**
 * Migration script to move terminals from Terminal collection to Store.terminals arrays
 *
 * This script:
 * 1. Finds all terminals in the Terminal collection
 * 2. For each terminal, determines its store based on storeId field
 * 3. Adds the terminal to the store's terminals array
 * 4. Removes the terminal from the Terminal collection (optional - commented out by default)
 *
 * Usage:
 * Run this script manually or import and call migrateTerminalsToStores()
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTerminalsToStores = migrateTerminalsToStores;
const mongoose_1 = __importDefault(require("mongoose"));
const Store_1 = __importDefault(require("../models/Store"));
const Terminal_1 = require("../models/Terminal");
async function migrateTerminalsToStores(dryRun = true) {
    console.log('🚀 Starting terminal migration to stores...');
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE (changes will be saved)'}\n`);
    try {
        // Find all terminals
        const terminals = await Terminal_1.Terminal.find({});
        console.log(`Found ${terminals.length} terminal(s) to migrate\n`);
        if (terminals.length === 0) {
            console.log('✅ No terminals to migrate. Exiting.');
            return;
        }
        const migrationResults = {
            success: 0,
            failed: 0,
            skipped: 0,
            errors: [],
        };
        for (const terminal of terminals) {
            try {
                // Determine storeId
                let storeId = null;
                if (terminal.storeId) {
                    // Store-based terminal
                    storeId = terminal.storeId.toLowerCase();
                }
                else if (terminal.merchantId) {
                    // Merchant-based terminal - need to find merchant's store
                    const { Merchant } = await Promise.resolve().then(() => __importStar(require('../models/Merchant')));
                    const merchant = await Merchant.findById(terminal.merchantId);
                    if (merchant && merchant.storeId) {
                        storeId = merchant.storeId.toLowerCase();
                    }
                }
                if (!storeId) {
                    console.log(`⚠️  Skipping terminal ${terminal.terminalId} (ID: ${terminal._id}): No store ID found`);
                    migrationResults.skipped++;
                    continue;
                }
                // Find store
                const store = await Store_1.default.findOne({ storeId });
                if (!store) {
                    console.log(`⚠️  Skipping terminal ${terminal.terminalId} (ID: ${terminal._id}): Store '${storeId}' not found`);
                    migrationResults.skipped++;
                    migrationResults.errors.push({
                        terminalId: terminal.terminalId,
                        error: `Store '${storeId}' not found`,
                    });
                    continue;
                }
                // Check if terminal already exists in store
                if (store.terminals && store.terminals.length > 0) {
                    const existing = store.terminals.find((t) => t.terminalId.toUpperCase() === terminal.terminalId.toUpperCase());
                    if (existing) {
                        console.log(`⚠️  Skipping terminal ${terminal.terminalId} (ID: ${terminal._id}): Already exists in store '${storeId}'`);
                        migrationResults.skipped++;
                        continue;
                    }
                }
                // Create terminal object for store
                const storeTerminal = {
                    terminalId: terminal.terminalId,
                    merchantIdMid: terminal.merchantIdMid || terminal.terminalId, // Use terminalId as fallback if no MID
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
                    updatedAt: terminal.updatedAt,
                };
                // Add terminal to store
                if (!store.terminals) {
                    store.terminals = [];
                }
                store.terminals.push(storeTerminal);
                if (!dryRun) {
                    await store.save();
                    console.log(`✅ Migrated terminal ${terminal.terminalId} (ID: ${terminal._id}) to store '${storeId}'`);
                }
                else {
                    console.log(`[DRY RUN] Would migrate terminal ${terminal.terminalId} (ID: ${terminal._id}) to store '${storeId}'`);
                }
                migrationResults.success++;
            }
            catch (error) {
                console.error(`❌ Error migrating terminal ${terminal.terminalId} (ID: ${terminal._id}):`, error.message);
                migrationResults.failed++;
                migrationResults.errors.push({
                    terminalId: terminal.terminalId,
                    error: error.message,
                });
            }
        }
        console.log('\n📊 Migration Summary:');
        console.log(`  ✅ Success: ${migrationResults.success}`);
        console.log(`  ⚠️  Skipped: ${migrationResults.skipped}`);
        console.log(`  ❌ Failed: ${migrationResults.failed}`);
        if (migrationResults.errors.length > 0) {
            console.log('\n❌ Errors:');
            migrationResults.errors.forEach((err) => {
                console.log(`  - Terminal ${err.terminalId}: ${err.error}`);
            });
        }
        if (dryRun) {
            console.log('\n⚠️  This was a DRY RUN. No changes were saved.');
            console.log('   Run with dryRun=false to apply changes.');
        }
        else {
            console.log('\n✅ Migration completed!');
            // Optionally delete terminals from Terminal collection
            // Uncomment the following lines if you want to remove terminals from the old collection:
            /*
            console.log('\n🗑️  Removing terminals from Terminal collection...');
            for (const terminal of terminals) {
              try {
                await terminal.deleteOne();
                console.log(`✅ Removed terminal ${terminal.terminalId} from Terminal collection`);
              } catch (error: any) {
                console.error(`❌ Error removing terminal ${terminal.terminalId}:`, error.message);
              }
            }
            */
        }
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}
// If running this file directly
if (require.main === module) {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pos-production';
    mongoose_1.default
        .connect(mongoUri)
        .then(() => {
        console.log('✅ Connected to MongoDB');
        // Run migration in dry-run mode by default
        const dryRun = process.env.DRY_RUN !== 'false';
        return migrateTerminalsToStores(dryRun);
    })
        .then(() => {
        console.log('\n✅ Migration script completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Migration script failed:', error);
        process.exit(1);
    });
}
