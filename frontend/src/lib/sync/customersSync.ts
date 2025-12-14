// Customer synchronization utility for POS
// Manages local customer cache and synchronizes with server
// Uses IndexedDB for efficient storage and fast search

import { customersApi, ApiError } from '@/lib/api/client';
import { customersDB } from '@/lib/db/customersDB';

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

export interface CustomerSyncResult {
  success: boolean;
  syncedCount: number;
  error?: string;
  customers?: any[];
}

class CustomerSyncManager {
  private syncInProgress: Set<string> = new Set();
  private lastSyncTime: number = 0;
  private readonly SYNC_COOLDOWN = 1000;

  async syncCustomers(forceRefresh: boolean = false): Promise<CustomerSyncResult> {
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
        const dbCustomers = await customersDB.getAllCustomers();
        if (dbCustomers && dbCustomers.length > 0) {
          return {
            success: true,
            syncedCount: dbCustomers.length,
            customers: dbCustomers,
          };
        }
      } catch (error) {
        console.warn('[CustomerSync] Error reading from IndexedDB, will fetch from server:', error);
      }
    }

    this.syncInProgress.add(storeId);
    this.lastSyncTime = now;

    try {
      const response = await customersApi.getCustomers();

      if (response.success) {
        const customers = (response.data as any)?.data?.customers || (response.data as any)?.customers || [];
        
        if (customers.length > 0) {
          await customersDB.storeCustomers(customers);
          customersDB.notifyOtherTabs();
        }

        return {
          success: true,
          syncedCount: customers.length,
          customers,
        };
      } else {
        return {
          success: false,
          syncedCount: 0,
          error: 'Failed to fetch customers',
        };
      }
    } catch (error: any) {
      const apiError = error as ApiError;
      console.error('[CustomerSync] Error syncing customers:', apiError);
      return {
        success: false,
        syncedCount: 0,
        error: apiError.message || 'Failed to sync customers',
      };
    } finally {
      this.syncInProgress.delete(storeId);
    }
  }

  async syncAfterCreateOrUpdate(customerData: any): Promise<CustomerSyncResult> {
    try {
      await customersDB.storeCustomer(customerData);
      customersDB.notifyOtherTabs();
      return {
        success: true,
        syncedCount: 1,
        customers: [customerData],
      };
    } catch (error: any) {
      console.error('[CustomerSync] Error syncing customer:', error);
      return {
        success: false,
        syncedCount: 0,
        error: error?.message || 'Failed to sync customer',
      };
    }
  }

  async syncAfterDelete(customerId: string | number): Promise<CustomerSyncResult> {
    try {
      await customersDB.deleteCustomer(customerId);
      customersDB.notifyOtherTabs();
      return {
        success: true,
        syncedCount: 1,
      };
    } catch (error) {
      console.error('[CustomerSync] Error deleting customer from IndexedDB:', error);
      return {
        success: false,
        syncedCount: 0,
        error: error instanceof Error ? error.message : 'Failed to delete customer',
      };
    }
  }

  async getCachedCustomers(): Promise<any[]> {
    try {
      return await customersDB.getAllCustomers();
    } catch (error) {
      console.error('[CustomerSync] Error getting customers from IndexedDB:', error);
      return [];
    }
  }
}

export const customerSync = new CustomerSyncManager();

