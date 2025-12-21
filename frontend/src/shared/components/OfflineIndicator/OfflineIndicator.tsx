/**
 * Offline Status Indicator Component
 * Displays connection status and pending sync information
 */

import React, { useState, useEffect } from 'react';
import { salesDB } from '@/lib/db/salesDB';
import { inventorySync } from '@/lib/sync/inventorySync';

interface OfflineIndicatorProps {
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSales, setPendingSales] = useState(0);
  const [pendingStockChanges, setPendingStockChanges] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Check pending items periodically
    const checkPendingItems = async () => {
      try {
        setIsChecking(true);
        
        // Get unsynced sales count
        try {
          const storeId = getStoreIdFromToken();
          if (storeId) {
            const unsyncedSales = await salesDB.getUnsyncedSales(storeId);
            setPendingSales(unsyncedSales.length);
          }
        } catch (error) {
          console.warn('Failed to get unsynced sales count:', error);
        }

        // Get unsynced stock changes count
        try {
          const unsyncedCount = await inventorySync.getUnsyncedCount();
          setPendingStockChanges(unsyncedCount);
        } catch (error) {
          console.warn('Failed to get unsynced stock changes count:', error);
        }
      } catch (error) {
        console.error('Error checking pending items:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Initial check
    checkPendingItems();

    // Check every 5 seconds
    const interval = setInterval(checkPendingItems, 5000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  const getStoreIdFromToken = (): string | null => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.storeId || null;
    } catch {
      return null;
    }
  };

  const totalPending = pendingSales + pendingStockChanges;

  if (isOnline && totalPending === 0) {
    // Online and everything synced - show minimal indicator or hide
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/30 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        <span className="text-xs font-medium text-green-400">Online</span>
      </div>
    );
  }

  if (!isOnline) {
    // Offline - show warning
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-600/20 border border-yellow-500/30 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
        <span className="text-xs font-medium text-yellow-400">Offline Mode</span>
        {totalPending > 0 && (
          <span className="text-xs text-yellow-300">({totalPending} pending)</span>
        )}
      </div>
    );
  }

  // Online but has pending items
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 ${className}`}>
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
      <span className="text-xs font-medium text-blue-400">Syncing...</span>
      {totalPending > 0 && (
        <span className="text-xs text-blue-300">({totalPending} pending)</span>
      )}
    </div>
  );
};

