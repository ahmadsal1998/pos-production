"use strict";
/**
 * Standalone script to purge trial accounts
 *
 * Usage:
 *   npm run purge-trials -- --dry-run                    # Preview what will be deleted
 *   npm run purge-trials -- --confirm                    # Actually delete (requires confirmation)
 *   npm run purge-trials -- --store-id=store1 --confirm # Delete specific trial account
 *
 * Safety:
 *   - Always runs in dry-run mode by default
 *   - Requires --confirm flag to actually delete
 *   - Only affects stores with isTrialAccount = true
 *   - Never touches production collections
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const database_1 = __importDefault(require("../config/database"));
const purgeTrialAccounts_1 = require("../utils/purgeTrialAccounts");
async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--confirm');
    const storeIdArg = args.find(arg => arg.startsWith('--store-id='));
    const storeId = storeIdArg ? storeIdArg.split('=')[1] : null;
    try {
        // Connect to database
        console.log('🔗 Connecting to database...');
        await (0, database_1.default)();
        console.log('✅ Connected\n');
        if (storeId) {
            // Purge specific trial account
            console.log(`📋 Generating purge report for store: ${storeId}...\n`);
            const result = await (0, purgeTrialAccounts_1.purgeSpecificTrialAccount)(storeId, dryRun, !dryRun);
            if (dryRun) {
                console.log('=== DRY RUN REPORT ===\n');
                console.log(`Store: ${result.store.name} (${result.store.storeId})`);
                console.log(`Created: ${result.store.createdAt}`);
                console.log(`\nDocuments to delete:`);
                Object.entries(result.deleted.documents).forEach(([collection, count]) => {
                    if (count > 0) {
                        console.log(`  - ${collection}: ${count} documents`);
                    }
                });
                console.log(`\nUsers to delete: ${result.deleted.users}`);
                console.log('\n⚠️  This is a DRY RUN. Use --confirm to actually delete.\n');
            }
            else {
                console.log('✅ Purge completed successfully!\n');
            }
        }
        else {
            // Purge all trial accounts
            console.log('📋 Generating purge report...\n');
            const result = await (0, purgeTrialAccounts_1.purgeTrialAccounts)(dryRun, !dryRun);
            if (dryRun) {
                console.log('=== DRY RUN REPORT ===\n');
                console.log(`Trial accounts found: ${result.report.storesFound}`);
                console.log(`\nStores to delete:`);
                result.report.storesToDelete.forEach(store => {
                    console.log(`  - ${store.name} (${store.storeId})`);
                    console.log(`    Created: ${store.createdAt}`);
                    console.log(`    Users: ${store.userCount}`);
                });
                console.log(`\nTest collections to purge:`);
                Object.entries(result.report.totalDocumentsToDelete).forEach(([collection, count]) => {
                    if (count > 0) {
                        console.log(`  - ${collection}: ${count} documents`);
                    }
                });
                console.log(`\nEstimated size: ${result.report.estimatedSize}`);
                console.log('\n⚠️  This is a DRY RUN. Use --confirm to actually delete.\n');
            }
            else {
                console.log('✅ Purge completed successfully!\n');
                if (result.errors.length > 0) {
                    console.log('Errors encountered:');
                    result.errors.forEach(error => console.log(`  - ${error}`));
                }
            }
        }
        // Close database connection
        await mongoose_1.default.connection.close();
        console.log('👋 Database connection closed');
        process.exit(0);
    }
    catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.message.includes('cancelled') || error.message.includes('DRY RUN')) {
            console.log('\n💡 Tip: This was a safety check. Use --confirm to proceed with deletion.\n');
        }
        await mongoose_1.default.connection.close();
        process.exit(1);
    }
}
// Run the script
main();
