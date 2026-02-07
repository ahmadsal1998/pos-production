/**
 * Hook for "sync on load" (e.g. POS load). Calls the single sync entry point
 * (runSyncOnLogin) so data fetching and sync logic stay in the sync layer;
 * pages stay focused on UI.
 */

import { useState, useCallback } from 'react';
import { runSyncOnLogin, RunSyncOnLoginResult } from './runSyncOnLogin';

export interface UseStoreDataSyncResult {
  isSyncing: boolean;
  error: string | null;
  lastResult: RunSyncOnLoginResult | null;
  runSync: () => Promise<RunSyncOnLoginResult>;
}

/**
 * Use this when a page needs to trigger full store data sync (e.g. POS load).
 * Sync runs through runSyncOnLogin so all entry points use the same layer.
 */
export function useStoreDataSync(storeId: string | null | undefined): UseStoreDataSyncResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RunSyncOnLoginResult | null>(null);

  const runSync = useCallback(async (): Promise<RunSyncOnLoginResult> => {
    if (!storeId) {
      const empty: RunSyncOnLoginResult = {
        success: false,
        productsSynced: 0,
        customersSynced: 0,
        productError: 'Store ID required',
      };
      setError('Store ID required');
      return empty;
    }
    setIsSyncing(true);
    setError(null);
    try {
      const result = await runSyncOnLogin(storeId);
      setLastResult(result);
      if (!result.success) {
        const msg = [result.productError, result.customerError].filter(Boolean).join('; ') || 'Sync failed';
        setError(msg);
      }
      return result;
    } catch (e: any) {
      const message = e?.message ?? 'Sync failed';
      setError(message);
      setLastResult(null);
      return {
        success: false,
        productsSynced: 0,
        customersSynced: 0,
        productError: message,
      };
    } finally {
      setIsSyncing(false);
    }
  }, [storeId]);

  return { isSyncing, error, lastResult, runSync };
}
