/**
 * Trial Account Data Purge Utility
 * 
 * This utility safely purges ALL data related to trial/free accounts including:
 * - All test collections (_test suffix) with data filtered by storeId
 * - Store records for trial accounts
 * - Associated users
 * - All store-related data: products, customers, sales, inventory, categories, brands, warehouses, units, payments, settings, merchants
 * 
 * CRITICAL DIFFERENCE FROM USER DELETION:
 * - User deletion: Only removes user account, store data remains intact
 * - Trial account deletion: Removes the ENTIRE store and ALL its data
 * 
 * SAFETY FEATURES:
 * - Dry-run mode to preview what will be deleted
 * - Confirmation prompts
 * - Detailed logging
 * - Only affects stores with isTrialAccount = true
 * - Only deletes data filtered by trial storeIds
 * - Never touches production collections or data
 * - Never touches non-trial store data
 */

import mongoose from 'mongoose';
import Store from '../models/Store';
import User from '../models/User';

// List of all collections that have _test variants
const TEST_COLLECTIONS = [
  'products_test',
  'customers_test',
  'sales_test',
  'categories_test',
  'brands_test',
  'warehouses_test',
  'units_test',
  'payments_test',
  'settings_test',
  'merchants_test',
];

interface PurgeReport {
  storesFound: number;
  storesToDelete: Array<{
    id: string;
    storeId: string;
    name: string;
    createdAt: Date;
    userCount: number;
  }>;
  collectionsToPurge: string[];
  totalDocumentsToDelete: {
    [collectionName: string]: number;
  };
  estimatedSize: string;
}

/**
 * Get all trial accounts
 */
export async function getTrialAccounts(): Promise<any[]> {
  return await Store.find({ isTrialAccount: true }).lean();
}

/**
 * Get document counts for test collections filtered by storeId(s)
 */
async function getTestCollectionCounts(
  db: mongoose.mongo.Db,
  storeIds: string[]
): Promise<{ [key: string]: number }> {
  const counts: { [key: string]: number } = {};
  
  if (storeIds.length === 0) {
    // Return zero counts if no stores
    TEST_COLLECTIONS.forEach(collectionName => {
      counts[collectionName] = 0;
    });
    return counts;
  }
  
  const normalizedStoreIds = storeIds.map(id => id.toLowerCase());
  
  for (const collectionName of TEST_COLLECTIONS) {
    try {
      const collection = db.collection(collectionName);
      // Count documents for all trial stores
      const count = await collection.countDocuments({
        storeId: { $in: normalizedStoreIds }
      });
      counts[collectionName] = count;
    } catch (error: any) {
      // Collection might not exist yet
      counts[collectionName] = 0;
    }
  }
  
  return counts;
}

/**
 * Get users associated with trial accounts
 */
async function getTrialAccountUsers(trialStoreIds: string[]): Promise<any[]> {
  if (trialStoreIds.length === 0) return [];
  
  return await User.find({
    storeId: { $in: trialStoreIds.map(id => id.toLowerCase()) }
  }).lean();
}

/**
 * Generate a purge report (dry-run)
 */
export async function generatePurgeReport(): Promise<PurgeReport> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }

  // Get all trial accounts
  const trialStores = await getTrialAccounts();
  const trialStoreIds = trialStores.map(store => store.storeId.toLowerCase());

  // Get associated users
  const trialUsers = await getTrialAccountUsers(trialStoreIds);

  // Get document counts for test collections (filtered by trial storeIds)
  const collectionCounts = await getTestCollectionCounts(db, trialStoreIds);

  // Calculate total documents
  const totalDocuments = Object.values(collectionCounts).reduce((sum, count) => sum + count, 0);
  const userCount = trialUsers.length;
  const storeCount = trialStores.length;

  // Estimate size (rough calculation: assume 1KB per document on average)
  const estimatedSizeMB = (totalDocuments + userCount + storeCount) * 0.001;

  return {
    storesFound: storeCount,
    storesToDelete: trialStores.map(store => ({
      id: store._id.toString(),
      storeId: store.storeId,
      name: store.name,
      createdAt: store.createdAt,
      userCount: trialUsers.filter(u => u.storeId?.toLowerCase() === store.storeId.toLowerCase()).length,
    })),
    collectionsToPurge: TEST_COLLECTIONS,
    totalDocumentsToDelete: collectionCounts,
    estimatedSize: `${estimatedSizeMB.toFixed(2)} MB`,
  };
}

/**
 * Purge all trial account data
 * @param dryRun - If true, only generates report without deleting
 * @param confirm - If true, skips confirmation prompt (use with caution)
 */
export async function purgeTrialAccounts(
  dryRun: boolean = true,
  confirm: boolean = false
): Promise<{
  success: boolean;
  report: PurgeReport;
  deleted: {
    stores: number;
    users: number;
    collections: { [key: string]: number };
  };
  errors: string[];
}> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }

  // Generate report first
  const report = await generatePurgeReport();
  const errors: string[] = [];
  const deleted = {
    stores: 0,
    users: 0,
    collections: {} as { [key: string]: number },
  };

  if (dryRun) {
    console.log('\n=== DRY RUN MODE - No data will be deleted ===\n');
    return {
      success: true,
      report,
      deleted,
      errors: [],
    };
  }

  // Safety check: Ensure we're only deleting trial accounts
  if (report.storesFound === 0) {
    console.log('No trial accounts found. Nothing to purge.');
    return {
      success: true,
      report,
      deleted,
      errors: [],
    };
  }

  // Confirmation prompt (unless confirm flag is set)
  if (!confirm) {
    console.log('\n⚠️  WARNING: This will permanently delete:');
    console.log(`   - ${report.storesFound} trial store(s)`);
    console.log(`   - ${report.storesToDelete.reduce((sum, s) => sum + s.userCount, 0)} user(s)`);
    console.log(`   - All documents in ${TEST_COLLECTIONS.length} test collections`);
    console.log(`   - Estimated size: ${report.estimatedSize}`);
    console.log('\nThis action CANNOT be undone!\n');
    throw new Error('Purge cancelled. Set confirm=true to proceed.');
  }

  console.log('\n🚀 Starting trial account purge...\n');

  // Get trial store IDs for filtering
  const trialStoreIds = report.storesToDelete.map(s => s.storeId.toLowerCase());

  // 1. Delete ALL store data from test collections (filtered by trial storeIds)
  // CRITICAL: This removes ALL data for trial stores:
  // - Products (products_test)
  // - Customers (customers_test)
  // - Sales/Invoices (sales_test)
  // - Categories (categories_test)
  // - Brands (brands_test)
  // - Warehouses (warehouses_test)
  // - Units (units_test)
  // - Payments (payments_test)
  // - Settings (settings_test)
  // - Merchants (merchants_test)
  // All deletions are filtered by storeId to ensure only trial store data is removed
  console.log('📦 Purging ALL store data from test collections...');
  for (const collectionName of TEST_COLLECTIONS) {
    try {
      const collection = db.collection(collectionName);
      // CRITICAL: Only delete documents belonging to trial stores
      // This ensures we don't accidentally delete data from other stores
      const count = await collection.countDocuments({
        storeId: { $in: trialStoreIds }
      });
      
      if (count > 0) {
        const result = await collection.deleteMany({
          storeId: { $in: trialStoreIds }
        });
        deleted.collections[collectionName] = result.deletedCount || 0;
        console.log(`   ✓ ${collectionName}: ${deleted.collections[collectionName]} documents deleted`);
      } else {
        deleted.collections[collectionName] = 0;
        console.log(`   - ${collectionName}: no documents found for trial stores (skipped)`);
      }
    } catch (error: any) {
      const errorMsg = `Error purging ${collectionName}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`   ✗ ${errorMsg}`);
    }
  }
  
  // Also check regular settings collection (in case Settings model doesn't use trial collections)
  console.log('\n⚙️  Checking regular settings collection for trial stores...');
  try {
    const settingsCollection = db.collection('settings');
    const settingsCount = await settingsCollection.countDocuments({
      storeId: { $in: trialStoreIds }
    });
    if (settingsCount > 0) {
      const settingsResult = await settingsCollection.deleteMany({
        storeId: { $in: trialStoreIds }
      });
      deleted.collections['settings'] = settingsResult.deletedCount || 0;
      console.log(`   ✓ settings: ${deleted.collections['settings']} documents deleted`);
    } else {
      console.log('   - settings: no documents found for trial stores (skipped)');
    }
  } catch (error: any) {
    // Settings collection might not exist - that's okay
    console.log('   - settings: skipped (may not exist or already in test collection)');
  }

  // 2. Delete associated users
  console.log('\n👥 Deleting associated users...');
  if (trialStoreIds.length > 0) {
    try {
      const deleteResult = await User.deleteMany({
        storeId: { $in: trialStoreIds }
      });
      deleted.users = deleteResult.deletedCount || 0;
      console.log(`   ✓ ${deleted.users} user(s) deleted`);
    } catch (error: any) {
      const errorMsg = `Error deleting users: ${error.message}`;
      errors.push(errorMsg);
      console.error(`   ✗ ${errorMsg}`);
    }
  }

  // 3. Delete trial store records
  console.log('\n🏪 Deleting trial store records...');
  try {
    const deleteResult = await Store.deleteMany({ isTrialAccount: true });
    deleted.stores = deleteResult.deletedCount || 0;
    console.log(`   ✓ ${deleted.stores} store(s) deleted`);
  } catch (error: any) {
    const errorMsg = `Error deleting stores: ${error.message}`;
    errors.push(errorMsg);
    console.error(`   ✗ ${errorMsg}`);
  }

  // 4. Clear trial status cache (if it exists)
  try {
    const { clearTrialStatusCache } = await import('./trialAccountModels');
    clearTrialStatusCache();
    console.log('   ✓ Trial status cache cleared');
  } catch (error) {
    // Cache clearing is optional
  }

  console.log('\n✅ Purge completed!\n');
  console.log('Summary:');
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
    errors,
  };
}

/**
 * Purge a specific trial account by storeId
 */
export async function purgeSpecificTrialAccount(
  storeId: string,
  dryRun: boolean = true,
  confirm: boolean = false
): Promise<{
  success: boolean;
  store: any;
  deleted: {
    users: number;
    documents: { [collectionName: string]: number };
  };
  errors: string[];
}> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }

  const normalizedStoreId = storeId.toLowerCase().trim();
  const errors: string[] = [];
  const deleted = {
    users: 0,
    documents: {} as { [key: string]: number },
  };

  // Find the store
  const store = await Store.findOne({ 
    storeId: normalizedStoreId,
    isTrialAccount: true 
  }).lean();

  if (!store) {
    throw new Error(`Trial account with storeId "${storeId}" not found`);
  }

  if (dryRun) {
    // Count documents for this store in test collections
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

    // Count users
    const userCount = await User.countDocuments({ 
      storeId: normalizedStoreId 
    });
    deleted.users = userCount;

    return {
      success: true,
      store,
      deleted,
      errors: [],
    };
  }

  if (!confirm) {
    throw new Error('Purge cancelled. Set confirm=true to proceed.');
  }

  console.log(`\n🚀 Purging trial account: ${store.name} (${storeId})\n`);

  // CRITICAL: Delete ALL store data from test collections for this specific store
  // This removes: products, customers, sales, categories, brands, warehouses, units, payments, settings, merchants
  // All data is filtered by storeId to ensure only this trial store's data is deleted
  console.log('📦 Deleting all store data from test collections...');
  for (const collectionName of TEST_COLLECTIONS) {
    try {
      const collection = db.collection(collectionName);
      // Filter by storeId to ensure only this store's data is deleted
      const result = await collection.deleteMany({ 
        storeId: normalizedStoreId 
      });
      deleted.documents[collectionName] = result.deletedCount || 0;
      if (deleted.documents[collectionName] > 0) {
        console.log(`   ✓ ${collectionName}: ${deleted.documents[collectionName]} documents deleted`);
      } else {
        console.log(`   - ${collectionName}: no documents found (skipped)`);
      }
    } catch (error: any) {
      const errorMsg = `Error purging ${collectionName}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`   ✗ ${errorMsg}`);
    }
  }

  // Delete all users associated with this store
  // CRITICAL: This removes all user accounts for this store
  // Unlike regular user deletion, this is part of complete store removal
  console.log('\n👥 Deleting all users associated with this store...');
  try {
    const deleteResult = await User.deleteMany({
      storeId: normalizedStoreId
    });
    deleted.users = deleteResult.deletedCount || 0;
    console.log(`   ✓ ${deleted.users} user(s) deleted`);
  } catch (error: any) {
    const errorMsg = `Error deleting users: ${error.message}`;
    errors.push(errorMsg);
    console.error(`   ✗ ${errorMsg}`);
  }

  // Also check regular settings collection (in case Settings model doesn't use trial collections)
  // This ensures we delete settings even if they're in the regular collection
  console.log('\n⚙️  Checking regular settings collection...');
  try {
    const settingsCollection = db.collection('settings');
    const settingsResult = await settingsCollection.deleteMany({
      storeId: normalizedStoreId
    });
    if (settingsResult.deletedCount > 0) {
      console.log(`   ✓ settings: ${settingsResult.deletedCount} documents deleted`);
      deleted.documents['settings'] = settingsResult.deletedCount;
    }
  } catch (error: any) {
    // Settings collection might not exist or might be in test collection - that's okay
    console.log('   - settings: skipped (may not exist or already in test collection)');
  }

  // Delete the store record itself
  // This is the final step - removes the store from the stores collection
  console.log('\n🏪 Deleting store record...');
  try {
    await Store.deleteOne({ _id: store._id });
    console.log(`   ✓ Store record deleted`);
  } catch (error: any) {
    const errorMsg = `Error deleting store: ${error.message}`;
    errors.push(errorMsg);
    console.error(`   ✗ ${errorMsg}`);
  }
  
  // Clear trial status cache for this store
  try {
    const { clearTrialStatusCache } = await import('./trialAccountModels');
    clearTrialStatusCache(normalizedStoreId);
    console.log('   ✓ Trial status cache cleared');
  } catch (error) {
    // Cache clearing is optional
  }

  console.log('\n✅ Purge completed!');
  console.log('\nSummary:');
  console.log(`   - Store: ${store.name} (${storeId})`);
  console.log(`   - Users deleted: ${deleted.users}`);
  console.log(`   - Collections purged: ${Object.keys(deleted.documents).length}`);
  Object.entries(deleted.documents).forEach(([collection, count]) => {
    if (count > 0) {
      console.log(`     • ${collection}: ${count} documents`);
    }
  });
  if (errors.length > 0) {
    console.log(`   - Errors: ${errors.length}`);
  }
  console.log('');

  return {
    success: errors.length === 0,
    store,
    deleted,
    errors,
  };
}

