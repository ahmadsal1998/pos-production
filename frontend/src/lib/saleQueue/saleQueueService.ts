/**
 * Sale Queue Service
 * Implements FIFO queue for sequential sale processing with isolated sale contexts
 * 
 * Lifecycle: CREATED → QUEUED → PROCESSING → CONFIRMED | FAILED
 */

import { salesSync } from '../sync/salesSync';
import { salesDB, SaleRecord } from '../db/salesDB';
import { logger } from '../utils/logger';

export type SaleLifecycleState = 'CREATED' | 'QUEUED' | 'PROCESSING' | 'CONFIRMED' | 'FAILED';

export interface IsolatedSaleContext {
  saleId: string; // UUID
  invoiceNumber: string; // Temporary/in-progress invoice number
  cart: any; // POSInvoice - isolated cart state
  storeId: string;
  createdAt: number; // Timestamp
  state: SaleLifecycleState;
  error?: string; // Error message if FAILED
  backendId?: string; // Backend-assigned ID after confirmation
}

export interface SaleQueueItem {
  context: IsolatedSaleContext;
  saleData: SaleRecord; // Formatted sale data for backend
  resolve: (result: { success: boolean; backendId?: string; error?: string }) => void;
  reject: (error: Error) => void;
}

class SaleQueueService {
  private queue: SaleQueueItem[] = [];
  private processing: boolean = false;
  private listeners: Set<(queueLength: number, processing: boolean) => void> = new Set();

  /**
   * Generate UUID for sale context
   */
  generateSaleId(): string {
    // Use crypto.randomUUID if available, otherwise fallback
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'sale_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  /**
   * Add sale to queue
   * Returns a promise that resolves when the sale is processed
   */
  async enqueueSale(context: IsolatedSaleContext, saleData: SaleRecord): Promise<{ success: boolean; backendId?: string; error?: string }> {
    // Update context state to QUEUED
    context.state = 'QUEUED';

    return new Promise((resolve, reject) => {
      const queueItem: SaleQueueItem = {
        context,
        saleData,
        resolve,
        reject,
      };

      this.queue.push(queueItem);
      this.notifyListeners();

      // Start processing if not already processing
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queue sequentially (FIFO)
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return; // Already processing
    }

    this.processing = true;
    this.notifyListeners();

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) {
        break;
      }

      try {
        // Update context state to PROCESSING
        item.context.state = 'PROCESSING';
        this.notifyListeners();

        logger.debug(`[SaleQueue] Processing sale ${item.context.saleId} (${item.context.invoiceNumber})`);

        // Save to IndexedDB first (for offline support)
        const saleRecord = {
          id: item.context.saleId,
          invoiceNumber: item.context.invoiceNumber,
          storeId: item.context.storeId,
          date: item.saleData.date || new Date(),
          customerId: item.saleData.customerId,
          customerName: item.saleData.customerName,
          items: item.saleData.items,
          subtotal: item.saleData.subtotal,
          totalItemDiscount: item.saleData.totalItemDiscount,
          invoiceDiscount: item.saleData.invoiceDiscount,
          tax: item.saleData.tax,
          total: item.saleData.total,
          paidAmount: item.saleData.paidAmount,
          remainingAmount: item.saleData.remainingAmount,
          paymentMethod: item.saleData.paymentMethod,
          status: item.saleData.status,
          seller: item.saleData.seller,
          synced: false, // Will be synced to backend
        };

        try {
          await salesDB.init();
          await salesDB.saveSale(saleRecord);
        } catch (dbError) {
          logger.warn(`[SaleQueue] Failed to save sale to IndexedDB:`, dbError);
          // Continue anyway - will sync to backend
        }

        // Sync to backend (this will handle invoice number generation atomically)
        const syncResult = await salesSync.syncSale(saleRecord, item.context.storeId, true);

        if (syncResult.success) {
          // Update context state to CONFIRMED
          item.context.state = 'CONFIRMED';
          item.context.backendId = syncResult.backendId;

          logger.debug(`[SaleQueue] Sale ${item.context.saleId} confirmed (backend ID: ${syncResult.backendId})`);

          item.resolve({
            success: true,
            backendId: syncResult.backendId,
          });
        } else {
          // Update context state to FAILED
          item.context.state = 'FAILED';
          item.context.error = syncResult.error || 'Unknown error';

          logger.error(`[SaleQueue] Sale ${item.context.saleId} failed:`, syncResult.error);

          item.resolve({
            success: false,
            error: syncResult.error,
          });
        }
      } catch (error: any) {
        // Update context state to FAILED
        item.context.state = 'FAILED';
        item.context.error = error?.message || 'Unknown error';

        logger.error(`[SaleQueue] Error processing sale ${item.context.saleId}:`, error);

        item.reject(error instanceof Error ? error : new Error(error?.message || 'Unknown error'));
      }

      this.notifyListeners();
    }

    this.processing = false;
    this.notifyListeners();
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): { queueLength: number; processing: boolean } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
    };
  }

  /**
   * Subscribe to queue status changes
   */
  subscribe(listener: (queueLength: number, processing: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of queue status change
   */
  private notifyListeners(): void {
    const status = this.getQueueStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status.queueLength, status.processing);
      } catch (error) {
        logger.error('[SaleQueue] Error in listener:', error);
      }
    });
  }

  /**
   * Clear queue (emergency function, not recommended for normal use)
   */
  clearQueue(): void {
    this.queue.forEach((item) => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.processing = false;
    this.notifyListeners();
  }
}

// Export singleton instance
export const saleQueueService = new SaleQueueService();

