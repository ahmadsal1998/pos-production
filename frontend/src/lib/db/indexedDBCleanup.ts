/**
 * IndexedDB cleanup utility
 * Handles complete cleanup of all local databases on logout
 */

import { productsDB } from './productsDB';
import { salesDB } from './salesDB';
import { customersDB } from './customersDB';
import { categoriesDB } from './categoriesDB';
import { unitsDB } from './unitsDB';
import { brandsDB } from './brandsDB';
import { salesSync } from '../sync/salesSync';
import { getIndexedDB } from './indexedDBUtils';

/**
 * Database names used in the application
 */
const DATABASE_NAMES = [
  'POS_ProductsDB',
  'POS_Sales_DB',
  'POS_CustomersDB',
  'POS_CategoriesDB',
  'POS_UnitsDB',
  'POS_BrandsDB',
] as const;

/**
 * Close all open database connections
 */
async function closeAllConnections(): Promise<void> {
  try {
    // Close all database connections
    productsDB.close();
    salesDB.close();
    customersDB.close();
    categoriesDB.close();
    unitsDB.close();
    brandsDB.close();
    
    // Give connections time to close
    await new Promise((resolve) => setTimeout(resolve, 100));
  } catch (error) {
    console.warn('[IndexedDBCleanup] Error closing connections:', error);
    // Continue with cleanup even if closing fails
  }
}

/**
 * Delete a single IndexedDB database
 */
function deleteDatabase(dbName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const idb = getIndexedDB();
    if (!idb) {
      // IndexedDB not available, consider it cleaned
      resolve();
      return;
    }

    const deleteRequest = idb.deleteDatabase(dbName);

    deleteRequest.onsuccess = () => {
      console.log(`[IndexedDBCleanup] Deleted database: ${dbName}`);
      resolve();
    };

    deleteRequest.onerror = () => {
      console.error(`[IndexedDBCleanup] Error deleting database ${dbName}:`, deleteRequest.error);
      // Continue even if deletion fails (database might not exist)
      resolve();
    };

    deleteRequest.onblocked = () => {
      console.warn(`[IndexedDBCleanup] Database ${dbName} deletion blocked, retrying...`);
      // Wait a bit and retry
      setTimeout(() => {
        deleteDatabase(dbName).then(resolve).catch(reject);
      }, 200);
    };
  });
}

/**
 * Sync all unsynced sales before cleanup
 */
async function syncUnsyncedData(): Promise<void> {
  try {
    console.log('[IndexedDBCleanup] Syncing unsynced sales before cleanup...');
    
    // Get storeId from token if available
    let storeId: string | undefined;
    try {
      const token = localStorage.getItem('auth-token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        storeId = payload.storeId;
      }
    } catch (error) {
      console.warn('[IndexedDBCleanup] Could not extract storeId from token:', error);
    }

    // Sync unsynced sales
    const syncResult = await salesSync.syncUnsyncedSales(storeId);
    
    if (syncResult.success) {
      console.log(`[IndexedDBCleanup] Sync completed: ${syncResult.synced} synced, ${syncResult.failed} failed`);
    } else {
      console.warn('[IndexedDBCleanup] Some sales failed to sync:', syncResult.errors);
    }
    
    // Wait a bit to ensure sync operations complete
    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch (error) {
    console.error('[IndexedDBCleanup] Error syncing unsynced data:', error);
    // Continue with cleanup even if sync fails
  }
}

/**
 * Clean up all IndexedDB databases
 * This function:
 * 1. Syncs any unsynced data
 * 2. Closes all open connections
 * 3. Deletes all databases
 */
export async function cleanupAllIndexedDB(): Promise<void> {
  try {
    console.log('[IndexedDBCleanup] Starting IndexedDB cleanup...');

    // Step 1: Sync unsynced data before cleanup
    await syncUnsyncedData();

    // Step 2: Close all open connections
    await closeAllConnections();

    // Step 3: Delete all databases
    const deletePromises = DATABASE_NAMES.map((dbName) => deleteDatabase(dbName));
    await Promise.all(deletePromises);

    console.log('[IndexedDBCleanup] IndexedDB cleanup completed successfully');
  } catch (error) {
    console.error('[IndexedDBCleanup] Error during cleanup:', error);
    // Try to continue with cleanup even if there are errors
    try {
      await closeAllConnections();
      const deletePromises = DATABASE_NAMES.map((dbName) => deleteDatabase(dbName));
      await Promise.all(deletePromises);
    } catch (fallbackError) {
      console.error('[IndexedDBCleanup] Fallback cleanup also failed:', fallbackError);
    }
  }
}

