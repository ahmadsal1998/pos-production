/**
 * Migration script to assign existing stores to distributed databases
 *
 * Usage:
 *   npx ts-node src/scripts/migrateStores.ts
 *
 * This script:
 * 1. Connects to the main database
 * 2. Finds all stores without databaseId
 * 3. Assigns them to databases based on store count
 * 4. Updates store records with databaseId
 *
 * IMPORTANT: Backup your database before running this script!
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Store from '../models/Store';
import { DATABASE_CONFIG } from '../utils/databaseManager';
import { ensureAdminDatabase } from '../config/database';

dotenv.config();

const migrateExistingStores = async () => {
  try {
    console.log('🔄 Starting store migration...\n');

    const mongoUri = process.env.MONGODB_URI as string;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    const uriWithAdminDb = ensureAdminDatabase(mongoUri);
    await mongoose.connect(uriWithAdminDb);
    console.log('✅ Connected to main database\n');

    const allStores = await Store.find({}).sort({ createdAt: 1 });
    console.log(`📊 Found ${allStores.length} total stores\n`);

    const storesWithoutDb = allStores.filter(store => !store.databaseId);
    const storesWithDb = allStores.filter(store => store.databaseId);

    console.log(`📋 Stores without databaseId: ${storesWithoutDb.length}`);
    console.log(`✅ Stores with databaseId: ${storesWithDb.length}\n`);

    if (storesWithoutDb.length === 0) {
      console.log('✅ All stores already have databaseId assigned. No migration needed.');
      await mongoose.disconnect();
      return;
    }

    const storesPerDatabase: { [key: number]: number } = {};
    for (let i = 1; i <= DATABASE_CONFIG.DATABASE_COUNT; i++) {
      storesPerDatabase[i] = storesWithDb.filter(s => s.databaseId === i).length;
    }

    console.log('📊 Current distribution:');
    Object.entries(storesPerDatabase).forEach(([dbId, count]) => {
      console.log(`   Database ${dbId}: ${count} stores`);
    });
    console.log('');

    let assignedCount = 0;
    for (const store of storesWithoutDb) {
      let targetDatabase = 1;
      let minCount = storesPerDatabase[1];

      for (let dbId = 2; dbId <= DATABASE_CONFIG.DATABASE_COUNT; dbId++) {
        if (storesPerDatabase[dbId] < minCount) {
          minCount = storesPerDatabase[dbId];
          targetDatabase = dbId;
        }
      }

      store.databaseId = targetDatabase;
      await store.save();
      storesPerDatabase[targetDatabase]++;

      assignedCount++;
      console.log(`✅ Store "${store.name}" (${store.storeId}) → Database ${targetDatabase}`);

      if (assignedCount % 10 === 0) {
        console.log(`   Progress: ${assignedCount}/${storesWithoutDb.length} stores migrated\n`);
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Migrated ${assignedCount} stores\n`);

    console.log('📊 Final distribution:');
    Object.entries(storesPerDatabase).forEach(([dbId, count]) => {
      console.log(`   Database ${dbId}: ${count} stores`);
    });

    const remaining = await Store.countDocuments({ databaseId: { $exists: false } });
    if (remaining > 0) {
      console.log(`\n⚠️  Warning: ${remaining} stores still without databaseId`);
    } else {
      console.log(`\n✅ All stores have databaseId assigned`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  } catch (error: any) {
    console.error('\n❌ Migration error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
};

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

export default migrateExistingStores;
