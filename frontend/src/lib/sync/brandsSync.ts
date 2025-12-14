// Brand synchronization utility for POS
// Manages local brand cache and synchronizes with server
// Uses IndexedDB for efficient storage and fast search

import { brandsApi, ApiError } from '@/lib/api/client';
import { brandsDB } from '@/lib/db/brandsDB';

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

export interface BrandSyncResult {
  success: boolean;
  syncedCount: number;
  error?: string;
  brands?: any[];
}

class BrandSyncManager {
  private syncInProgress: Set<string> = new Set();
  private lastSyncTime: number = 0;
  private readonly SYNC_COOLDOWN = 1000;

  async syncBrands(forceRefresh: boolean = false): Promise<BrandSyncResult> {
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
        const dbBrands = await brandsDB.getAllBrands();
        if (dbBrands && dbBrands.length > 0) {
          return {
            success: true,
            syncedCount: dbBrands.length,
            brands: dbBrands,
          };
        }
      } catch (error) {
        console.warn('[BrandSync] Error reading from IndexedDB, will fetch from server:', error);
      }
    }

    this.syncInProgress.add(storeId);
    this.lastSyncTime = now;

    try {
      const response = await brandsApi.getBrands();

      if (response.success) {
        const brands = (response.data as any)?.brands || [];
        
        if (brands.length > 0) {
          await brandsDB.storeBrands(brands);
          brandsDB.notifyOtherTabs();
        }

        return {
          success: true,
          syncedCount: brands.length,
          brands,
        };
      } else {
        return {
          success: false,
          syncedCount: 0,
          error: 'Failed to fetch brands',
        };
      }
    } catch (error: any) {
      const apiError = error as ApiError;
      console.error('[BrandSync] Error syncing brands:', apiError);
      return {
        success: false,
        syncedCount: 0,
        error: apiError.message || 'Failed to sync brands',
      };
    } finally {
      this.syncInProgress.delete(storeId);
    }
  }

  async syncAfterCreateOrUpdate(brandData: any): Promise<BrandSyncResult> {
    try {
      await brandsDB.storeBrand(brandData);
      brandsDB.notifyOtherTabs();
      return {
        success: true,
        syncedCount: 1,
        brands: [brandData],
      };
    } catch (error: any) {
      console.error('[BrandSync] Error syncing brand:', error);
      return {
        success: false,
        syncedCount: 0,
        error: error?.message || 'Failed to sync brand',
      };
    }
  }

  async syncAfterDelete(brandId: string | number): Promise<BrandSyncResult> {
    try {
      await brandsDB.deleteBrand(brandId);
      brandsDB.notifyOtherTabs();
      return {
        success: true,
        syncedCount: 1,
      };
    } catch (error) {
      console.error('[BrandSync] Error deleting brand from IndexedDB:', error);
      return {
        success: false,
        syncedCount: 0,
        error: error instanceof Error ? error.message : 'Failed to delete brand',
      };
    }
  }

  async getCachedBrands(): Promise<any[]> {
    try {
      return await brandsDB.getAllBrands();
    } catch (error) {
      console.error('[BrandSync] Error getting brands from IndexedDB:', error);
      return [];
    }
  }
}

export const brandSync = new BrandSyncManager();

