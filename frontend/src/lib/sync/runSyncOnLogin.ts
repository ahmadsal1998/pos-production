/**
 * Single sync entry point for "after login" and "POS load".
 * All sync-on-login and initial store data sync should go through this layer
 * so we don't duplicate sync logic in the auth store or pages.
 *
 * @see docs/SYNC_FLOW.md — When sync runs, what is synced, conflicts/partial failures, offline, incremental sync.
 */

import { syncQueue } from './syncQueue';
import { productSync } from './productSync';
import { customerSync } from './customerSync';

export interface RunSyncOnLoginResult {
  success: boolean;
  productsSynced: number;
  customersSynced: number;
  productError?: string;
  customerError?: string;
}

/**
 * Run full store data sync (products + customers) through the sync queue.
 * Use this after login and when POS/main store view loads.
 * Sync logic lives only here and in productSync/customerSync; auth store and pages
 * should call this instead of calling productSync/customerSync directly for "on login" flow.
 */
export async function runSyncOnLogin(storeId: string): Promise<RunSyncOnLoginResult> {
  const result: RunSyncOnLoginResult = {
    success: true,
    productsSynced: 0,
    customersSynced: 0,
  };

  const runSync = async (): Promise<void> => {
    console.log('[Sync] Starting store data sync (products + customers) for store:', storeId);

    const productResult = await productSync.syncProducts({ forceRefresh: true });
    if (productResult.success) {
      result.productsSynced = productResult.syncedCount;
      console.log('[Sync] Products synced:', productResult.syncedCount);
    } else {
      result.productError = productResult.error;
      result.success = false;
      console.error('[Sync] Product sync failed:', productResult.error);
    }

    const customerResult = await customerSync.syncCustomers({ forceRefresh: true });
    if (customerResult.success) {
      result.customersSynced = customerResult.syncedCount;
      console.log('[Sync] Customers synced:', customerResult.syncedCount);
    } else {
      result.customerError = customerResult.error;
      result.success = false;
      console.error('[Sync] Customer sync failed:', customerResult.error);
    }
  };

  await syncQueue.enqueue(runSync, 1);
  return result;
}
