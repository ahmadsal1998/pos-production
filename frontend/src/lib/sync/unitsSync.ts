// Unit synchronization utility for POS
// Manages local unit cache and synchronizes with server
// Uses IndexedDB for efficient storage and fast search

import { unitsApi, ApiError } from '@/lib/api/client';
import { unitsDB } from '@/lib/db/unitsDB';

function getStoreIdFromToken(): string | null {
  try {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      return null;
    }
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.storeId || null;
  } catch (error) {
    return null;
  }
}

export interface UnitSyncResult {
  success: boolean;
  syncedCount: number;
  error?: string;
  units?: any[];
}

class UnitSyncManager {
  private syncInProgress: Set<string> = new Set();
  private lastSyncTime: number = 0;
  private readonly SYNC_COOLDOWN = 1000;

  async syncUnits(forceRefresh: boolean = false): Promise<UnitSyncResult> {
    const storeId = getStoreIdFromToken();
    
    if (!storeId) {
      return {
        success: false,
        syncedCount: 0,
        error: 'Store ID not found',
      };
    }

    if (this.syncInProgress.has(storeId)) {
      return {
        success: false,
        syncedCount: 0,
        error: 'Sync already in progress',
      };
    }

    const now = Date.now();
    if (!forceRefresh && now - this.lastSyncTime < this.SYNC_COOLDOWN) {
      return {
        success: false,
        syncedCount: 0,
        error: 'Sync cooldown active',
      };
    }

    if (!forceRefresh) {
      try {
        const dbUnits = await unitsDB.getAllUnits();
        if (dbUnits && dbUnits.length > 0) {
          return {
            success: true,
            syncedCount: dbUnits.length,
            units: dbUnits,
          };
        }
      } catch (error) {
        console.warn('[UnitSync] Error reading from IndexedDB, will fetch from server:', error);
      }
    }

    this.syncInProgress.add(storeId);
    this.lastSyncTime = now;

    try {
      const response = await unitsApi.getUnits();

      if (response.success) {
        const units = (response.data as any)?.units || [];
        
        if (units.length > 0) {
          await unitsDB.storeUnits(units);
          unitsDB.notifyOtherTabs();
        }

        return {
          success: true,
          syncedCount: units.length,
          units,
        };
      } else {
        return {
          success: false,
          syncedCount: 0,
          error: 'Failed to fetch units',
        };
      }
    } catch (error: any) {
      const apiError = error as ApiError;
      console.error('[UnitSync] Error syncing units:', apiError);
      return {
        success: false,
        syncedCount: 0,
        error: apiError.message || 'Failed to sync units',
      };
    } finally {
      this.syncInProgress.delete(storeId);
    }
  }

  async syncAfterCreateOrUpdate(unitData: any): Promise<UnitSyncResult> {
    try {
      await unitsDB.storeUnit(unitData);
      unitsDB.notifyOtherTabs();
      return {
        success: true,
        syncedCount: 1,
        units: [unitData],
      };
    } catch (error: any) {
      console.error('[UnitSync] Error syncing unit:', error);
      return {
        success: false,
        syncedCount: 0,
        error: error?.message || 'Failed to sync unit',
      };
    }
  }

  async syncAfterDelete(unitId: string | number): Promise<UnitSyncResult> {
    try {
      await unitsDB.deleteUnit(unitId);
      unitsDB.notifyOtherTabs();
      return {
        success: true,
        syncedCount: 1,
      };
    } catch (error) {
      console.error('[UnitSync] Error deleting unit from IndexedDB:', error);
      return {
        success: false,
        syncedCount: 0,
        error: error instanceof Error ? error.message : 'Failed to delete unit',
      };
    }
  }

  async getCachedUnits(): Promise<any[]> {
    try {
      return await unitsDB.getAllUnits();
    } catch (error) {
      console.error('[UnitSync] Error getting units from IndexedDB:', error);
      return [];
    }
  }
}

export const unitSync = new UnitSyncManager();

