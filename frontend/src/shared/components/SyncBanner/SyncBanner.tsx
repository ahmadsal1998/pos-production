/**
 * Banner shown when store data sync (products/customers) failed.
 * Lets the user know data may be outdated and offers Retry or Dismiss.
 */

import React, { useState } from 'react';
import { useAuthStore } from '@/app/store';

const SYNC_FAILED_LABEL = 'البيانات قد تكون غير محدثة - فشل التزامن';
const RETRY_LABEL = 'إعادة المحاولة';
const DISMISS_LABEL = 'إغلاق';

export const SyncBanner: React.FC = () => {
  const { lastSyncResult, retrySync, clearLastSyncResult } = useAuthStore();
  const [isRetrying, setIsRetrying] = useState(false);

  if (!lastSyncResult || lastSyncResult.success) return null;

  const message =
    lastSyncResult.productError && lastSyncResult.customerError
      ? `${SYNC_FAILED_LABEL} (منتجات وعملاء)`
      : lastSyncResult.productError
        ? `${SYNC_FAILED_LABEL} (منتجات)`
        : lastSyncResult.customerError
          ? `${SYNC_FAILED_LABEL} (عملاء)`
          : SYNC_FAILED_LABEL;

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retrySync();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm"
    >
      <span className="font-medium">{message}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRetrying ? '...' : RETRY_LABEL}
        </button>
        <button
          type="button"
          onClick={clearLastSyncResult}
          className="px-3 py-1.5 rounded-lg border border-amber-600 dark:border-amber-500 text-amber-800 dark:text-amber-200 hover:bg-amber-200/50 dark:hover:bg-amber-800/30 font-medium"
        >
          {DISMISS_LABEL}
        </button>
      </div>
    </div>
  );
};
