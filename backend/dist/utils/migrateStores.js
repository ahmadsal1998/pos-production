"use strict";
/**
 * Migration script to assign existing stores to distributed databases
 *
 * Usage:
 *   npx ts-node src/utils/migrateStores.ts
 *
 * This script:
 * 1. Connects to the main database
 * 2. Finds all stores without databaseId
 * 3. Assigns them to databases based on store count
 * 4. Updates store records with databaseId
 *
 * IMPORTANT: Backup your database before running this script!
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Store_1 = __importDefault(require("../models/Store"));
const databaseManager_1 = require("./databaseManager");
const database_1 = require("../config/database");
dotenv_1.default.config();
const migrateExistingStores = async () => {
    try {
        console.log('🔄 Starting store migration...\n');
        // Connect to main database
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }
        const uriWithAdminDb = (0, database_1.ensureAdminDatabase)(mongoUri);
        await mongoose_1.default.connect(uriWithAdminDb);
        console.log('✅ Connected to main database\n');
        // Find all stores
        const allStores = await Store_1.default.find({}).sort({ createdAt: 1 });
        console.log(`📊 Found ${allStores.length} total stores\n`);
        // Separate stores with and without databaseId
        const storesWithoutDb = allStores.filter(store => !store.databaseId);
        const storesWithDb = allStores.filter(store => store.databaseId);
        console.log(`📋 Stores without databaseId: ${storesWithoutDb.length}`);
        console.log(`✅ Stores with databaseId: ${storesWithDb.length}\n`);
        if (storesWithoutDb.length === 0) {
            console.log('✅ All stores already have databaseId assigned. No migration needed.');
            await mongoose_1.default.disconnect();
            return;
        }
        // Count stores per database to maintain distribution
        const storesPerDatabase = {};
        for (let i = 1; i <= databaseManager_1.DATABASE_CONFIG.DATABASE_COUNT; i++) {
            storesPerDatabase[i] = storesWithDb.filter(s => s.databaseId === i).length;
        }
        console.log('📊 Current distribution:');
        Object.entries(storesPerDatabase).forEach(([dbId, count]) => {
            console.log(`   Database ${dbId}: ${count} stores`);
        });
        console.log('');
        // Assign stores to databases
        let assignedCount = 0;
        for (const store of storesWithoutDb) {
            // Find database with least stores
            let targetDatabase = 1;
            let minCount = storesPerDatabase[1];
            for (let dbId = 2; dbId <= databaseManager_1.DATABASE_CONFIG.DATABASE_COUNT; dbId++) {
                if (storesPerDatabase[dbId] < minCount) {
                    minCount = storesPerDatabase[dbId];
                    targetDatabase = dbId;
                }
            }
            // Assign store to target database
            store.databaseId = targetDatabase;
            await store.save();
            storesPerDatabase[targetDatabase]++;
            assignedCount++;
            console.log(`✅ Store "${store.name}" (${store.prefix}) → Database ${targetDatabase}`);
            // Show progress every 10 stores
            if (assignedCount % 10 === 0) {
                console.log(`   Progress: ${assignedCount}/${storesWithoutDb.length} stores migrated\n`);
            }
        }
        console.log(`\n✅ Migration completed!`);
        console.log(`   Migrated ${assignedCount} stores\n`);
        // Show final distribution
        console.log('📊 Final distribution:');
        Object.entries(storesPerDatabase).forEach(([dbId, count]) => {
            console.log(`   Database ${dbId}: ${count} stores`);
        });
        // Verify all stores have databaseId
        const remaining = await Store_1.default.countDocuments({ databaseId: { $exists: false } });
        if (remaining > 0) {
            console.log(`\n⚠️  Warning: ${remaining} stores still without databaseId`);
        }
        else {
            console.log(`\n✅ All stores have databaseId assigned`);
        }
        await mongoose_1.default.disconnect();
        console.log('\n✅ Disconnected from database');
    }
    catch (error) {
        console.error('\n❌ Migration error:', error.message);
        console.error(error.stack);
        await mongoose_1.default.disconnect();
        process.exit(1);
    }
};
// Run migration
if (require.main === module) {
    migrateExistingStores()
        .then(() => {
        console.log('\n✅ Migration script completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n❌ Migration script failed:', error);
        process.exit(1);
    });
}
exports.default = migrateExistingStores;
