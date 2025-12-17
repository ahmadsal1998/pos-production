// Customer synchronization utility
// Manages local customer cache and synchronizes with server after any create, update, or delete operation
// Uses IndexedDB for efficient storage and fast search

import { customersApi, ApiError } from '@/lib/api/client';
import { customersDB } from '@/lib/db/customersDB';

export interface CustomerSyncOptions {
  /**
   * Force refresh from server even if cache is valid
   */
  forceRefresh?: boolean;
  
  /**
   * Callback when sync completes
   */
  onSyncComplete?: (syncedCount: number) => void;
}

export interface CustomerSyncResult {
  success: boolean;
  syncedCount: number;
  error?: string;
  customers?: any[];
}

/**
 * Get store ID from auth token
 */
function getStoreIdFromToken(): string | null {
  try {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      return null;
    }
    const payload = JSON.parse(atob(token.split('.')[1]));
    const storeId = payload.storeId || null;
    // Normalize storeId to lowercase to match backend behavior
    return storeId ? storeId.toLowerCase().trim() : null;
  } catch (error) {
    console.error('[CustomerSync] Error getting storeId from token:', error);
    return null;
  }
}

/**
 * Customer synchronization manager
 * Handles local cache management and server synchronization
 */
class CustomerSyncManager {
  /**
   * Single-flight map to prevent concurrent syncs per store.
   * If a sync is already running, additional calls will await the same promise.
   */
  private inFlightSyncByStore: Map<string, Promise<CustomerSyncResult>> = new Map();
  private lastSyncTime: number = 0;
  private readonly SYNC_COOLDOWN = 1000; // 1 second cooldown between syncs

  /**
   * Sync customers from server and update local cache
   */
  async syncCustomers(options: CustomerSyncOptions = {}): Promise<CustomerSyncResult> {
    const { forceRefresh = false, onSyncComplete } = options;
    const storeId = getStoreIdFromToken();
    
    if (!storeId) {
      return {
        success: false,
        syncedCount: 0,
        error: 'Store ID not found',
      };
    }

    // Prevent concurrent sync calls (single-flight)
    const inFlight = this.inFlightSyncByStore.get(storeId);
    if (inFlight) {
      // Important: do not surface this as an error to callers; just await the existing sync.
      console.log('[CustomerSync] Sync already in progress, joining existing sync...');
      return inFlight;
    }

    const now = Date.now();
    // Create and register the in-flight promise BEFORE any await to avoid races.
    const syncPromise: Promise<CustomerSyncResult> = (async () => {
      // Check cooldown
      if (!forceRefresh && now - this.lastSyncTime < this.SYNC_COOLDOWN) {
        console.log('[CustomerSync] Sync cooldown active, skipping...');
        return {
          success: false,
          syncedCount: 0,
          error: 'Sync cooldown active',
        };
      }

      // Check IndexedDB first (unless force refresh)
      if (!forceRefresh) {
        try {
          const dbCustomers = await customersDB.getAllCustomers();
          if (dbCustomers && dbCustomers.length > 0) {
            // IndexedDB has customers, return them
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

      this.lastSyncTime = now;

      try {
        // Fetch all customers from server
        console.log('[CustomerSync] Fetching customers from server with forceRefresh:', forceRefresh);
        const response = await customersApi.getCustomers();

        console.log('[CustomerSync] API response:', {
          success: response.success,
          hasData: !!response.data,
          dataKeys: response.data ? Object.keys(response.data) : []
        });

        if (response.success) {
          const customersData = (response.data as any)?.data?.customers || [];
          console.log(`[CustomerSync] Received ${customersData.length} customers from server`);

          if (customersData.length > 0) {
            // Store in IndexedDB (primary storage)
            try {
              console.log('[CustomerSync] Storing customers in IndexedDB...');
              await customersDB.storeCustomers(customersData);
              // Notify other tabs
              (customersDB as any).notifyOtherTabs();
              console.log('[CustomerSync] Successfully stored customers in IndexedDB');
              
              // Verify storage
              const verifyCustomers = await customersDB.getAllCustomers();
              console.log(`[CustomerSync] Verification: IndexedDB now contains ${verifyCustomers?.length || 0} customers`);
            } catch (dbError) {
              console.error('[CustomerSync] Error storing customers in IndexedDB:', dbError);
              console.error('[CustomerSync] DB error details:', {
                message: dbError instanceof Error ? dbError.message : String(dbError),
                stack: dbError instanceof Error ? dbError.stack : undefined
              });
            }

            const result: CustomerSyncResult = {
              success: true,
              syncedCount: customersData.length,
              customers: customersData,
            };

            if (onSyncComplete) {
              onSyncComplete(customersData.length);
            }

            return result;
          } else {
            console.log('[CustomerSync] Server returned empty customer list');
            return {
              success: true,
              syncedCount: 0,
              customers: [],
            };
          }
        } else {
          console.error('[CustomerSync] API response was not successful');
          return {
            success: false,
            syncedCount: 0,
            error: 'Failed to fetch customers from server',
          };
        }
      } catch (error: any) {
        const apiError = error as ApiError;
        console.error('[CustomerSync] Error syncing customers:', apiError);
        console.error('[CustomerSync] Error details:', {
          message: apiError.message,
          status: apiError.status,
          code: apiError.code,
          stack: error instanceof Error ? error.stack : undefined
        });
        return {
          success: false,
          syncedCount: 0,
          error: apiError.message || 'Failed to sync customers',
        };
      } finally {
        this.inFlightSyncByStore.delete(storeId);
      }
    })();

    this.inFlightSyncByStore.set(storeId, syncPromise);
    return syncPromise;
  }

  /**
   * Sync a single customer after create/update (directly store without fetching)
   * Use this when you already have the customer data from the API response
   */
  async syncAfterCreateOrUpdate(customerData: any): Promise<CustomerSyncResult> {
    const storeId = getStoreIdFromToken();
    if (!storeId) {
      return {
        success: false,
        syncedCount: 0,
        error: 'Store ID not found',
      };
    }

    try {
      // Store the customer directly in IndexedDB (we already have it from the response)
      try {
        await customersDB.storeCustomer(customerData);
        // Notify other tabs
        (customersDB as any).notifyOtherTabs();
        console.log(`[CustomerSync] Successfully synced customer ${customerData.id || customerData._id}`);
      } catch (dbError) {
        console.error('[CustomerSync] Error storing customer in IndexedDB:', dbError);
        // Fallback: fetch from server and sync
        const customerId = customerData.id || customerData._id;
        if (customerId) {
          return this.syncCustomer(String(customerId));
        }
      }

      return {
        success: true,
        syncedCount: 1,
        customers: [customerData],
      };
    } catch (error: any) {
      const apiError = error as ApiError;
      console.error('[CustomerSync] Error syncing customer:', apiError);
      return {
        success: false,
        syncedCount: 0,
        error: apiError.message || 'Failed to sync customer',
      };
    }
  }

  /**
   * Sync a single customer after create/update (fetches from server)
   * Use this when you only have the customer ID
   */
  async syncCustomer(customerId: string): Promise<CustomerSyncResult> {
    const storeId = getStoreIdFromToken();
    if (!storeId) {
      return {
        success: false,
        syncedCount: 0,
        error: 'Store ID not found',
      };
    }

    try {
      // Fetch the customer from server
      const response = await customersApi.getCustomer(customerId);
      
      if (!response.success) {
        return {
          success: false,
          syncedCount: 0,
          error: 'Failed to fetch customer from server',
        };
      }
      
      const customer = (response.data as any)?.data?.customer;

      if (customer) {
        // Update IndexedDB with new customer data
        try {
          await customersDB.storeCustomer(customer);
          // Notify other tabs
          (customersDB as any).notifyOtherTabs();
        } catch (dbError) {
          console.error('[CustomerSync] Error updating IndexedDB:', dbError);
        }

        return {
          success: true,
          syncedCount: 1,
          customers: [customer],
        };
      }

      return {
        success: false,
        syncedCount: 0,
        error: 'Customer not found',
      };
    } catch (error: any) {
      const apiError = error as ApiError;
      console.error('[CustomerSync] Error syncing customer:', apiError);
      return {
        success: false,
        syncedCount: 0,
        error: apiError.message || 'Failed to sync customer',
      };
    }
  }

  /**
   * Sync customers after create/update/delete operation
   * This ensures local cache is updated immediately after changes
   */
  async syncAfterChange(customerId?: string): Promise<CustomerSyncResult> {
    console.log('[CustomerSync] Syncing customers after change...');

    // If a specific customer ID is provided, sync just that customer
    if (customerId) {
      try {
        const result = await this.syncCustomer(customerId);
        if (result.success) {
          console.log(`[CustomerSync] Successfully synced customer ${customerId}`);
        } else {
          console.warn(`[CustomerSync] Failed to sync customer: ${result.error}`);
          // Fallback to full sync
          return this.syncCustomers({ forceRefresh: true });
        }
        return result;
      } catch (error: any) {
        console.error('[CustomerSync] Error in sync after change:', error);
        // Fallback to full sync
        return this.syncCustomers({ forceRefresh: true });
      }
    }

    // Otherwise, do a full sync
    try {
      const result = await this.syncCustomers({ forceRefresh: true });
      if (result.success) {
        console.log(`[CustomerSync] Successfully synced ${result.syncedCount} customer(s)`);
      } else {
        console.warn(`[CustomerSync] Failed to sync customers: ${result.error}`);
      }
      return result;
    } catch (error: any) {
      console.error('[CustomerSync] Error in sync after change:', error);
      return {
        success: false,
        syncedCount: 0,
        error: error?.message || 'Failed to sync customers',
      };
    }
  }

  /**
   * Delete a customer from IndexedDB (used when customer is deleted on server)
   */
  async syncAfterDelete(customerId: string | number): Promise<CustomerSyncResult> {
    const storeId = getStoreIdFromToken();
    if (!storeId) {
      return {
        success: false,
        syncedCount: 0,
        error: 'Store ID not found',
      };
    }

    try {
      // Delete from IndexedDB
      await customersDB.deleteCustomer(customerId);
      // Notify other tabs
      (customersDB as any).notifyOtherTabs();
      console.log(`[CustomerSync] Deleted customer ${customerId} from IndexedDB`);

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

  /**
   * Delete a customer from IndexedDB (used when customer is deleted on server)
   * @deprecated Use syncAfterDelete instead, which returns CustomerSyncResult
   */
  async deleteCustomer(customerId: string): Promise<void> {
    const result = await this.syncAfterDelete(customerId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete customer');
    }
  }

  /**
   * Get cached customers from IndexedDB (if available)
   */
  async getCachedCustomers(): Promise<any[]> {
    try {
      return await customersDB.getAllCustomers();
    } catch (error) {
      console.error('[CustomerSync] Error getting customers from IndexedDB:', error);
      return [];
    }
  }

  /**
   * Search customers in IndexedDB
   */
  async searchCustomers(searchTerm: string): Promise<any[]> {
    try {
      return await customersDB.searchCustomers({ searchTerm });
    } catch (error) {
      console.error('[CustomerSync] Error searching customers in IndexedDB:', error);
      return [];
    }
  }
}

// Export singleton instance
export const customerSync = new CustomerSyncManager();

