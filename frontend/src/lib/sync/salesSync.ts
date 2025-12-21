/**
 * Sales synchronization service
 * Handles syncing between IndexedDB and backend API
 */

import { salesDB, SaleRecord } from '../db/salesDB';
import { salesApi } from '../api/client';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ saleId: string; error: string }>;
}

class SalesSyncService {
  private isSyncing = false;
  private syncInterval: number | null = null;

  /**
   * Initialize sync service
   */
  async init(): Promise<void> {
    // Try to initialize IndexedDB (may fail on some mobile browsers)
    try {
      await salesDB.init();
      console.log('✅ Sales sync service initialized with IndexedDB');
    } catch (error) {
      console.warn('⚠️ IndexedDB not available, sync service will work without local storage:', error);
      // Continue anyway - we can still sync to backend
    }

    // Start periodic sync (every 30 seconds)
    this.startPeriodicSync(30000);

    // Sync on page visibility change (when user comes back to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.syncUnsyncedSales().catch((error) => {
          console.error('Error syncing on visibility change:', error);
        });
      }
    });

    // Sync on online event
    window.addEventListener('online', () => {
      this.syncUnsyncedSales().catch((error) => {
        console.error('Error syncing on online event:', error);
      });
    });
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync(intervalMs: number): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = window.setInterval(() => {
      this.syncUnsyncedSales().catch((error) => {
        console.error('Error in periodic sync:', error);
      });
    }, intervalMs);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sync a single sale to backend
   */
  async syncSale(sale: SaleRecord, storeId: string, indexedDBAvailable: boolean = true): Promise<{ success: boolean; backendId?: string; error?: string }> {
    try {
      // Prepare sale data for backend (remove local-only fields)
      const saleData = {
        invoiceNumber: sale.invoiceNumber,
        date: sale.date,
        customerId: sale.customerId,
        customerName: sale.customerName,
        items: sale.items,
        subtotal: sale.subtotal,
        totalItemDiscount: sale.totalItemDiscount,
        invoiceDiscount: sale.invoiceDiscount,
        tax: sale.tax,
        total: sale.total,
        paidAmount: sale.paidAmount,
        remainingAmount: sale.remainingAmount,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        seller: sale.seller,
        isReturn: sale.isReturn || false,
        originalInvoiceId: sale.originalInvoiceId,
      };

      // Call backend API
      const response = await salesApi.createSale(saleData);

      if (response.data && (response.data as any).success) {
        const savedSale = (response.data as any).data?.sale;
        const backendId = savedSale?.id || savedSale?._id;

        // Mark as synced in IndexedDB (only if available)
        if (indexedDBAvailable && sale.id) {
          try {
            await salesDB.markAsSynced(sale.id, backendId, sale.storeId, sale.invoiceNumber);
          } catch (dbError) {
            console.warn('⚠️ Failed to mark sale as synced in IndexedDB:', dbError);
            // Continue anyway - backend sync succeeded
          }
        }

        console.log('✅ Sale synced successfully:', sale.invoiceNumber);
        return { success: true, backendId };
      } else {
        throw new Error('Backend returned unsuccessful response');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown sync error';
      const statusCode = error?.response?.status || error?.status;
      
      // Detect 409 Conflict (invoice number already exists)
      if (statusCode === 409) {
        // Check if the sale was already synced (maybe from another device/tab)
        // In this case, we should mark it as synced rather than error
        try {
          // Try to fetch the existing sale from server to get its ID
          const existingSalesResponse = await salesApi.getSales({
            invoiceNumber: sale.invoiceNumber,
            storeId: sale.storeId,
            limit: 1,
          });
          
          const existingSales = (existingSalesResponse.data as any)?.data?.sales || [];
          if (existingSales.length > 0) {
            const existingSale = existingSales[0];
            const backendId = existingSale.id || existingSale._id;
            
            // Sale already exists on server - mark as synced
            if (indexedDBAvailable && sale.id) {
              await salesDB.markAsSynced(sale.id, backendId, sale.storeId, sale.invoiceNumber);
            }
            
            console.log(`✅ Sale ${sale.invoiceNumber} already exists on server, marked as synced`);
            return { success: true, backendId };
          }
        } catch (fetchError) {
          // Couldn't fetch existing sale, treat as conflict
          console.warn('Could not verify existing sale:', fetchError);
        }
        
        // True conflict - invoice number exists but we can't verify it's the same sale
        const conflictMessage = `Invoice number ${sale.invoiceNumber} already exists on server. This may happen if an invoice was suspended and restored. The sale has been saved locally and will be retried.`;
        console.error('❌ Invoice number conflict:', sale.invoiceNumber, conflictMessage);
        
        // Mark sync error in IndexedDB with specific conflict message
        // Don't mark as permanently failed - will retry on next sync
        if (indexedDBAvailable && sale.id) {
          try {
            await salesDB.markSyncError(sale.id, conflictMessage, sale.storeId, sale.invoiceNumber);
          } catch (dbError) {
            console.warn('⚠️ Failed to mark sync error in IndexedDB:', dbError);
            // Continue anyway
          }
        }
        
        return { success: false, error: conflictMessage };
      }
      
      console.error('❌ Failed to sync sale:', sale.invoiceNumber, errorMessage);

      // Mark sync error in IndexedDB (only if available)
      if (indexedDBAvailable && sale.id) {
        try {
          await salesDB.markSyncError(sale.id, errorMessage, sale.storeId, sale.invoiceNumber);
        } catch (dbError) {
          console.warn('⚠️ Failed to mark sync error in IndexedDB:', dbError);
          // Continue anyway
        }
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Sync all unsynced sales
   */
  async syncUnsyncedSales(storeId?: string): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    // Check if online
    if (!navigator.onLine) {
      console.log('📴 Offline, skipping sync');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    this.isSyncing = true;

    try {
      const unsyncedSales = await salesDB.getUnsyncedSales(storeId);
      console.log(`🔄 Syncing ${unsyncedSales.length} unsynced sales...`);

      if (unsyncedSales.length === 0) {
        this.isSyncing = false;
        return { success: true, synced: 0, failed: 0, errors: [] };
      }

      const results: SyncResult = {
        success: true,
        synced: 0,
        failed: 0,
        errors: [],
      };

      // Sync sales sequentially to avoid overwhelming the backend
      for (const sale of unsyncedSales) {
        const saleStoreId = sale.storeId || storeId;
        if (!saleStoreId) {
          console.warn('⚠️ Sale missing storeId, skipping:', sale.invoiceNumber);
          results.failed++;
          results.errors.push({
            saleId: sale.id || 'unknown',
            error: 'Missing storeId',
          });
          continue;
        }

        const syncResult = await this.syncSale(sale, saleStoreId);

        if (syncResult.success) {
          results.synced++;
        } else {
          results.failed++;
          results.errors.push({
            saleId: sale.id || 'unknown',
            error: syncResult.error || 'Unknown error',
          });
        }

        // Small delay between syncs to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(`✅ Sync completed: ${results.synced} synced, ${results.failed} failed`);
      this.isSyncing = false;
      return results;
    } catch (error: any) {
      console.error('❌ Error during sync:', error);
      this.isSyncing = false;
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [{ saleId: 'unknown', error: error?.message || 'Unknown error' }],
      };
    }
  }

  /**
   * Create a sale and sync immediately
   * This is the main method to use when creating a new sale
   */
  async createAndSyncSale(sale: SaleRecord, storeId: string): Promise<{ success: boolean; saleId?: string; error?: string }> {
    let indexedDBAvailable = false;
    let localSaleId: string | undefined;

    try {
      // Ensure storeId is set and normalized
      sale.storeId = storeId.toLowerCase().trim();

      // Generate temporary ID if not provided
      // Use a combination of storeId, invoiceNumber, and timestamp to ensure uniqueness
      if (!sale.id && !sale._id) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        sale.id = `temp_${sale.storeId}_${sale.invoiceNumber}_${timestamp}_${random}`;
      }
      localSaleId = sale.id;

      // Try to save to IndexedDB first (for offline support)
      try {
        await salesDB.init();
        // Mark as unsynced initially
        sale.synced = false;
        await salesDB.saveSale(sale);
        indexedDBAvailable = true;
        console.log('💾 Sale saved to IndexedDB:', sale.invoiceNumber);
      } catch (dbError: any) {
        // IndexedDB not available or failed - log but continue
        console.warn('⚠️ IndexedDB not available, will sync directly to backend:', dbError?.message);
        indexedDBAvailable = false;
        // Continue to sync to backend even if IndexedDB fails
      }

      // Try to sync immediately if online
      if (navigator.onLine) {
        try {
          const syncResult = await this.syncSale(sale, storeId, indexedDBAvailable);
          if (syncResult.success) {
            return { success: true, saleId: syncResult.backendId || localSaleId };
          } else {
            // Sync failed but sale might be saved locally
            if (indexedDBAvailable) {
              console.warn('⚠️ Sale saved locally, will sync later:', syncResult.error);
              return { success: true, saleId: localSaleId, error: syncResult.error };
            } else {
              // No local storage, sync failed
              return { success: false, error: syncResult.error || 'Failed to sync sale' };
            }
          }
        } catch (syncError: any) {
          // Sync to backend failed
          if (indexedDBAvailable) {
            // At least saved locally
            console.warn('⚠️ Sale saved locally, sync to backend failed:', syncError?.message);
            return { success: true, saleId: localSaleId, error: syncError?.message || 'Failed to sync to backend' };
          } else {
            // No local storage and sync failed
            console.error('❌ Failed to save sale (no IndexedDB and sync failed):', syncError);
            return { success: false, error: syncError?.message || 'Failed to save sale' };
          }
        }
      } else {
        // Offline
        if (indexedDBAvailable) {
          // Sale is saved locally, will sync when online
          console.log('📴 Offline - sale saved locally, will sync when online');
          return { success: true, saleId: localSaleId };
        } else {
          // No IndexedDB and offline - cannot save
          return { success: false, error: 'Cannot save sale: offline and IndexedDB not available' };
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to create sale:', error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  /**
   * Get sales from IndexedDB (fast local access)
   */
  async getSales(
    storeId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      customerId?: string;
      status?: string;
      paymentMethod?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<SaleRecord[]> {
    await salesDB.init();
    return salesDB.getSalesByStore(storeId, filters);
  }

  /**
   * Get a single sale by ID
   */
  async getSale(saleId: string): Promise<SaleRecord | null> {
    await salesDB.init();
    return salesDB.getSale(saleId);
  }
}

// Export singleton instance
export const salesSync = new SalesSyncService();

// Export types
export type { SyncResult };

