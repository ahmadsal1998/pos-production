// Category synchronization utility for POS
// Manages local category cache and synchronizes with server
// Uses IndexedDB for efficient storage and fast search

import { categoriesApi, ApiError } from '@/lib/api/client';
import { categoriesDB } from '@/lib/db/categoriesDB';

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

export interface CategorySyncResult {
  success: boolean;
  syncedCount: number;
  error?: string;
  categories?: any[];
}

class CategorySyncManager {
  private syncInProgress: Set<string> = new Set();
  private lastSyncTime: number = 0;
  private readonly SYNC_COOLDOWN = 1000;

  async syncCategories(forceRefresh: boolean = false): Promise<CategorySyncResult> {
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
        const dbCategories = await categoriesDB.getAllCategories();
        if (dbCategories && dbCategories.length > 0) {
          return {
            success: true,
            syncedCount: dbCategories.length,
            categories: dbCategories,
          };
        }
      } catch (error) {
        console.warn('[CategorySync] Error reading from IndexedDB, will fetch from server:', error);
      }
    }

    this.syncInProgress.add(storeId);
    this.lastSyncTime = now;

    try {
      const response = await categoriesApi.getCategories();

      if (response.success) {
        const categories = (response.data as any)?.categories || [];
        
        if (categories.length > 0) {
          await categoriesDB.storeCategories(categories);
          categoriesDB.notifyOtherTabs();
        }

        return {
          success: true,
          syncedCount: categories.length,
          categories,
        };
      } else {
        return {
          success: false,
          syncedCount: 0,
          error: 'Failed to fetch categories',
        };
      }
    } catch (error: any) {
      const apiError = error as ApiError;
      console.error('[CategorySync] Error syncing categories:', apiError);
      return {
        success: false,
        syncedCount: 0,
        error: apiError.message || 'Failed to sync categories',
      };
    } finally {
      this.syncInProgress.delete(storeId);
    }
  }

  async syncAfterCreateOrUpdate(categoryData: any): Promise<CategorySyncResult> {
    try {
      await categoriesDB.storeCategory(categoryData);
      categoriesDB.notifyOtherTabs();
      return {
        success: true,
        syncedCount: 1,
        categories: [categoryData],
      };
    } catch (error: any) {
      console.error('[CategorySync] Error syncing category:', error);
      return {
        success: false,
        syncedCount: 0,
        error: error?.message || 'Failed to sync category',
      };
    }
  }

  async syncAfterDelete(categoryId: string | number): Promise<CategorySyncResult> {
    try {
      await categoriesDB.deleteCategory(categoryId);
      categoriesDB.notifyOtherTabs();
      return {
        success: true,
        syncedCount: 1,
      };
    } catch (error) {
      console.error('[CategorySync] Error deleting category from IndexedDB:', error);
      return {
        success: false,
        syncedCount: 0,
        error: error instanceof Error ? error.message : 'Failed to delete category',
      };
    }
  }

  async getCachedCategories(): Promise<any[]> {
    try {
      return await categoriesDB.getAllCategories();
    } catch (error) {
      console.error('[CategorySync] Error getting categories from IndexedDB:', error);
      return [];
    }
  }
}

export const categorySync = new CategorySyncManager();

