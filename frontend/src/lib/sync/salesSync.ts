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
    let savedInvoiceNumber: string | undefined;
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
  async syncSale(sale: SaleRecord, storeId: string, indexedDBAvailable: boolean = true): Promise<{ success: boolean; backendId?: string; error?: string; errorType?: string; duplicateInvoiceNumber?: string; invoiceContent?: any }> {
    let savedInvoiceNumber: string | undefined;
    try {
      // CRITICAL: Check if this sale was already synced before attempting sync
      // This prevents duplicate sync attempts
      if (sale.synced && sale._id) {
        console.log(`✅ Sale ${sale.invoiceNumber} already synced (backend ID: ${sale._id}), skipping sync`);
        return { success: true, backendId: sale._id };
      }

      // Prepare sale data for backend (remove local-only fields)
      // Normalize payment method to lowercase (backend expects: cash, card, credit)
      const normalizedPaymentMethod = sale.paymentMethod?.toLowerCase() || 'cash';
      const validPaymentMethods = ['cash', 'card', 'credit'];
      const finalPaymentMethod = validPaymentMethods.includes(normalizedPaymentMethod) 
        ? normalizedPaymentMethod 
        : 'cash'; // Default to cash if invalid
      
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
        paymentMethod: finalPaymentMethod,
        status: sale.status,
        seller: sale.seller,
        isReturn: sale.isReturn || false,
        originalInvoiceId: sale.originalInvoiceId,
      };

      // Call backend API
      const response = await salesApi.createSale(saleData);

      if (response.data && (response.data as any).success) {
        const savedSale = (response.data as any).data?.sale;
        savedInvoiceNumber = savedSale?.invoiceNumber;
        const backendId = savedSale?.id || savedSale?._id;

        // Mark as synced in IndexedDB (only if available)
        if (indexedDBAvailable && sale.id) {
          try {
            await salesDB.markAsSynced(
              sale.id,
              backendId,
              sale.storeId,
              sale.invoiceNumber,
              savedInvoiceNumber && savedInvoiceNumber !== sale.invoiceNumber ? savedInvoiceNumber : undefined
            );
            // Keep local sale object aligned with backend-assigned invoice number to avoid future conflicts
            if (savedInvoiceNumber && savedInvoiceNumber !== sale.invoiceNumber) {
              sale.invoiceNumber = savedInvoiceNumber;
            }
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
        const errorData = error?.response?.data?.data;
        const backendErrorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
        const errorType = errorData?.errorType;
        
        // Invoice number conflict - generate new number and retry
        const duplicateInvoiceNumber = errorData?.duplicateInvoiceNumber || sale.invoiceNumber;
        
        const detailedErrorMessage = `تعارض رقم الفاتورة: رقم الفاتورة ${sale.invoiceNumber} مستخدم بالفعل. سيتم إنشاء رقم فاتورة جديد تلقائياً.`;
        
        console.warn(`⚠️ INVOICE NUMBER CONFLICT BY BACKEND: ${detailedErrorMessage}`);
        
        // Mark as error but allow retry with new number
        if (indexedDBAvailable && sale.id) {
          try {
            await salesDB.markSyncError(sale.id, detailedErrorMessage, sale.storeId, sale.invoiceNumber);
          } catch (dbError) {
            console.warn('Could not mark conflict error in IndexedDB:', dbError);
          }
        }
        
        const conflictResult: any = { 
          success: false, 
          error: detailedErrorMessage,
          errorType: 'invoice_number_conflict',
          duplicateInvoiceNumber: duplicateInvoiceNumber,
        };
        
        return conflictResult;
      }
      
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
          
          // Mark as synced since it exists on server
          if (indexedDBAvailable && sale.id) {
            await salesDB.markAsSynced(
              sale.id,
              backendId,
              sale.storeId,
              sale.invoiceNumber,
              savedInvoiceNumber && savedInvoiceNumber !== sale.invoiceNumber ? savedInvoiceNumber : undefined
            );
            if (savedInvoiceNumber && savedInvoiceNumber !== sale.invoiceNumber) {
              sale.invoiceNumber = savedInvoiceNumber;
            }
          }
          
          console.log(`✅ Sale ${sale.invoiceNumber} already exists on server, marked as synced`);
          return { success: true, backendId };
        }
      } catch (fetchError) {
        // Couldn't fetch existing sale, continue with error handling
        console.warn('Could not verify existing sale:', fetchError);
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
      
      // Log all unsynced sales for debugging
      if (unsyncedSales.length > 0) {
        console.log('[SalesSync] Unsynced sales:', unsyncedSales.map(s => ({
          id: s.id,
          invoiceNumber: s.invoiceNumber,
          storeId: s.storeId,
          synced: s.synced,
          syncError: s.syncError
        })));
      }

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
      for (let i = 0; i < unsyncedSales.length; i++) {
        const sale = unsyncedSales[i];
        const saleStoreId = sale.storeId || storeId;
        
        console.log(`[SalesSync] Syncing sale ${i + 1}/${unsyncedSales.length}: ${sale.invoiceNumber} (ID: ${sale.id})`);
        
        if (!saleStoreId) {
          console.warn('⚠️ Sale missing storeId, skipping:', sale.invoiceNumber);
          results.failed++;
          results.errors.push({
            saleId: sale.id || 'unknown',
            error: 'Missing storeId',
          });
          continue;
        }

        // All sales can be retried - no duplicate content checks

        const syncResult = await this.syncSale(sale, saleStoreId);

        if (syncResult.success) {
          results.synced++;
          console.log(`✅ [SalesSync] Successfully synced sale ${i + 1}/${unsyncedSales.length}: ${sale.invoiceNumber}`);
        } else {
          results.failed++;
          const errorMessage = syncResult.error || 'Unknown error';
          results.errors.push({
            saleId: sale.id || 'unknown',
            error: errorMessage,
          });
          
          // Log error information
          console.error(`❌ [SalesSync] Failed to sync sale ${i + 1}/${unsyncedSales.length}: ${sale.invoiceNumber} - ${errorMessage}`);
        }

        // Small delay between syncs to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(`✅ Sync completed: ${results.synced} synced, ${results.failed} failed`);
      if (results.failed > 0) {
        console.warn(`⚠️ ${results.failed} sales failed to sync. Errors:`, results.errors);
      }
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
   * Create a sale and save to IndexedDB immediately without waiting for sync
   * The sale will be synced in the background automatically
   * This is the recommended method for creating new sales as it doesn't block the UI
   */
  async createSale(sale: SaleRecord, storeId: string): Promise<{ success: boolean; saleId?: string; error?: string }> {
    let localSaleId: string | undefined;

    try {
      // Ensure storeId is set and normalized
      sale.storeId = storeId.toLowerCase().trim();

      // Normalize payment method to lowercase (backend expects: cash, card, credit)
      if (sale.paymentMethod) {
        const normalizedPaymentMethod = sale.paymentMethod.toLowerCase();
        const validPaymentMethods = ['cash', 'card', 'credit'];
        sale.paymentMethod = validPaymentMethods.includes(normalizedPaymentMethod) 
          ? normalizedPaymentMethod 
          : 'cash'; // Default to cash if invalid
      } else {
        sale.paymentMethod = 'cash'; // Default if not provided
      }

      // Generate temporary ID if not provided
      // Use a combination of storeId, invoiceNumber, and timestamp to ensure uniqueness
      if (!sale.id && !sale._id) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        sale.id = `temp_${sale.storeId}_${sale.invoiceNumber}_${timestamp}_${random}`;
      }
      localSaleId = sale.id;

      // Save to IndexedDB immediately (mark as unsynced)
      try {
        await salesDB.init();
        // Mark as unsynced initially - will be synced by background worker
        sale.synced = false;
        await salesDB.saveSale(sale);
        console.log('💾 Sale saved to IndexedDB (will sync in background):', sale.invoiceNumber);
        
        // Trigger background sync immediately (non-blocking)
        // This ensures the sale syncs as soon as possible without blocking the UI
        this.syncUnsyncedSales(storeId).catch((error) => {
          console.warn('⚠️ Background sync triggered but failed (will retry later):', error);
        });
        
        return { success: true, saleId: localSaleId };
      } catch (dbError: any) {
        // IndexedDB not available - this is a critical error
        console.error('❌ Failed to save sale to IndexedDB:', dbError);
        return { success: false, error: dbError?.message || 'Failed to save sale to local storage' };
      }
    } catch (error: any) {
      console.error('❌ Failed to create sale:', error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  /**
   * Create a sale and sync immediately (blocking)
   * @deprecated Use createSale() instead for better UX. This method blocks the UI until sync completes.
   * Only use this if you specifically need to wait for sync confirmation.
   */
  async createAndSyncSale(sale: SaleRecord, storeId: string): Promise<{ success: boolean; saleId?: string; error?: string }> {
    let indexedDBAvailable = false;
    let localSaleId: string | undefined;

    try {
      // Ensure storeId is set and normalized
      sale.storeId = storeId.toLowerCase().trim();

      // Normalize payment method to lowercase (backend expects: cash, card, credit)
      if (sale.paymentMethod) {
        const normalizedPaymentMethod = sale.paymentMethod.toLowerCase();
        const validPaymentMethods = ['cash', 'card', 'credit'];
        sale.paymentMethod = validPaymentMethods.includes(normalizedPaymentMethod) 
          ? normalizedPaymentMethod 
          : 'cash'; // Default to cash if invalid
      } else {
        sale.paymentMethod = 'cash'; // Default if not provided
      }

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

  /**
   * Get count of unsynced sales for UI feedback
   */
  async getUnsyncedCount(storeId?: string): Promise<number> {
    try {
      const unsyncedSales = await salesDB.getUnsyncedSales(storeId);
      return unsyncedSales.length;
    } catch (error) {
      console.warn('⚠️ Failed to get unsynced count:', error);
      return 0;
    }
  }

  /**
   * Check if there are any unsynced sales
   */
  async hasUnsyncedSales(storeId?: string): Promise<boolean> {
    const count = await this.getUnsyncedCount(storeId);
    return count > 0;
  }
}

// Export singleton instance
export const salesSync = new SalesSyncService();

// Export types
export type { SyncResult };

