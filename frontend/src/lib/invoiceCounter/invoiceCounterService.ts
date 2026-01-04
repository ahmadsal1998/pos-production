/**
 * Local Invoice Counter Service
 * Maintains a local counter for immediate invoice number assignment
 * Backend confirms/resolves conflicts during sale processing
 */

import { salesApi } from '../api/client';
import { salesDB } from '../db/salesDB';
import { logger } from '../utils/logger';

class InvoiceCounterService {
  private currentNumber: number = 0;
  private storeId: string | null = null;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the counter from backend or IndexedDB
   * Should be called once when the POS page loads
   */
  async initialize(storeId: string): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initializeInternal(storeId);
    return this.initializationPromise;
  }

  private async _initializeInternal(storeId: string): Promise<void> {
    this.storeId = storeId;

    try {
      // Try to fetch from backend API first
      const response = await salesApi.getCurrentInvoiceNumber();
      const invoiceNumber = (response.data as any)?.data?.invoiceNumber || 'INV-1';
      
      // Extract the numeric part
      const match = invoiceNumber.match(/^INV-(\d+)$/);
      if (match) {
        this.currentNumber = parseInt(match[1], 10);
        this.initialized = true;
        logger.debug(`[InvoiceCounter] Initialized from backend: ${invoiceNumber} (number: ${this.currentNumber})`);
        return;
      }
    } catch (err: any) {
      logger.warn('[InvoiceCounter] Failed to get current invoice number from API, trying IndexedDB:', err);
    }

    // Fallback to IndexedDB
    try {
      await salesDB.init();
      const allSales = await salesDB.getSalesByStore(storeId);
      
      if (allSales.length > 0) {
        let maxNumber = 0;
        const sequentialPattern = /^INV-(\d+)$/;
        
        for (const sale of allSales) {
          if (sale.invoiceNumber) {
            const match = sale.invoiceNumber.match(sequentialPattern);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
              }
            }
          }
        }
        
        this.currentNumber = maxNumber;
        this.initialized = true;
        logger.debug(`[InvoiceCounter] Initialized from IndexedDB: INV-${this.currentNumber}`);
        return;
      }
    } catch (dbError: any) {
      logger.error('[InvoiceCounter] Failed to initialize from IndexedDB:', dbError);
    }

    // Last resort: start from 0
    this.currentNumber = 0;
    this.initialized = true;
    logger.warn('[InvoiceCounter] Initialized with fallback value: 0');
  }

  /**
   * Get the next invoice number (increments the counter)
   * This should be called when creating a new sale (even if it's a hold/pending)
   */
  getNextInvoiceNumber(): string {
    if (!this.initialized) {
      logger.warn('[InvoiceCounter] Counter not initialized, using fallback');
      this.currentNumber = Math.max(this.currentNumber, 0);
    }

    this.currentNumber += 1;
    const invoiceNumber = `INV-${this.currentNumber}`;
    
    logger.debug(`[InvoiceCounter] Generated next invoice number: ${invoiceNumber} (counter: ${this.currentNumber})`);
    return invoiceNumber;
  }

  /**
   * Get the current invoice number without incrementing
   */
  getCurrentInvoiceNumber(): string {
    if (!this.initialized) {
      logger.warn('[InvoiceCounter] Counter not initialized, using fallback');
      this.currentNumber = Math.max(this.currentNumber, 0);
    }

    return `INV-${this.currentNumber}`;
  }

  /**
   * Sync the counter with backend (optional, for recovery scenarios)
   * This can be called if we detect a conflict
   */
  async syncWithBackend(storeId?: string): Promise<void> {
    const targetStoreId = storeId || this.storeId;
    if (!targetStoreId) {
      logger.warn('[InvoiceCounter] Cannot sync: no storeId');
      return;
    }

    try {
      const response = await salesApi.getCurrentInvoiceNumber();
      const invoiceNumber = (response.data as any)?.data?.invoiceNumber || 'INV-1';
      
      const match = invoiceNumber.match(/^INV-(\d+)$/);
      if (match) {
        const backendNumber = parseInt(match[1], 10);
        // Only update if backend number is higher (to avoid going backwards)
        if (backendNumber >= this.currentNumber) {
          this.currentNumber = backendNumber;
          logger.debug(`[InvoiceCounter] Synced with backend: INV-${this.currentNumber}`);
        } else {
          logger.debug(`[InvoiceCounter] Backend number (${backendNumber}) is lower than current (${this.currentNumber}), keeping current`);
        }
      }
    } catch (err: any) {
      logger.error('[InvoiceCounter] Failed to sync with backend:', err);
    }
  }

  /**
   * Check if the counter is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset the counter (for testing or recovery)
   */
  reset(): void {
    this.currentNumber = 0;
    this.initialized = false;
    this.storeId = null;
    this.initializationPromise = null;
  }
}

// Export singleton instance
export const invoiceCounterService = new InvoiceCounterService();

