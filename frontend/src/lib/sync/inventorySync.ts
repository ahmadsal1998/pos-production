/**
 * Inventory synchronization service
 * Handles offline stock updates and syncs with backend when online
 * Uses event-driven sync with queue management and debouncing
 */

import { productsApi, ApiError } from '../api/client';
import { productsDB } from '../db/productsDB';
import { syncQueue } from './syncQueue';
import { debounce } from '../utils/debounce';
import { logger } from '../utils/logger';

interface StockChange {
  id: string;
  productId: string;
  productName: string;
  oldStock: number;
  newStock: number;
  change: number; // Positive for increases (returns), negative for decreases (sales)
  operation: 'sale' | 'return' | 'adjustment';
  timestamp: number;
  synced: boolean;
  syncError?: string;
  retryCount: number;
}

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ productId: string; error: string }>;
}

class InventorySyncService {
  private debouncedSync!: ReturnType<typeof debounce>;
  private hasUnsyncedChanges = false;
  private readonly DB_NAME = 'POS_Inventory_Sync_DB';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'stock_changes';
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB for stock changes queue
   */
  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        logger.error('Failed to open Inventory Sync IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('✅ Inventory sync service initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, {
            keyPath: 'id',
            autoIncrement: false,
          });
          store.createIndex('productId', 'productId', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize Inventory Sync IndexedDB');
    }
    return this.db;
  }

  /**
   * Queue a stock change for sync
   */
  async queueStockChange(
    productId: string,
    productName: string,
    oldStock: number,
    newStock: number,
    operation: 'sale' | 'return' | 'adjustment'
  ): Promise<void> {
    const db = await this.ensureDB();
    const change = newStock - oldStock;

    const stockChange: StockChange = {
      id: `stock_${productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId,
      productName,
      oldStock,
      newStock,
      change,
      operation,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.add(stockChange);

      request.onsuccess = () => {
        logger.debug(`📦 Queued stock change for ${productName}: ${oldStock} -> ${newStock} (${change > 0 ? '+' : ''}${change})`);
        // Notify that a stock change occurred (event-driven sync)
        this.notifyStockChange();
        resolve();
      };

      request.onerror = () => {
        logger.error('Failed to queue stock change:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all unsynced stock changes
   */
  async getUnsyncedChanges(): Promise<StockChange[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.openCursor();

      const changes: StockChange[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const change = cursor.value as StockChange;
          // Filter for unsynced changes (synced === false or undefined)
          if (change.synced === false || change.synced === undefined) {
            changes.push(change);
          }
          cursor.continue();
        } else {
          // Sort by timestamp (oldest first)
          changes.sort((a, b) => a.timestamp - b.timestamp);
          resolve(changes);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Mark a stock change as synced
   */
  async markAsSynced(changeId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const getRequest = store.get(changeId);

      getRequest.onsuccess = () => {
        const change = getRequest.result as StockChange;
        if (change) {
          change.synced = true;
          change.syncError = undefined;
          const putRequest = store.put(change);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Already deleted or doesn't exist
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Mark a stock change sync as failed
   */
  async markSyncError(changeId: string, error: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const getRequest = store.get(changeId);

      getRequest.onsuccess = () => {
        const change = getRequest.result as StockChange;
        if (change) {
          change.synced = false;
          change.syncError = error;
          change.retryCount = (change.retryCount || 0) + 1;
          const putRequest = store.put(change);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Delete a synced stock change (cleanup)
   */
  async deleteChange(changeId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(changeId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync a single stock change to backend
   */
  async syncStockChange(change: StockChange): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current product from server to handle conflicts
      const currentProductResponse = await productsApi.getProduct(change.productId);
      const currentProduct = (currentProductResponse.data as any)?.data?.product || 
                            (currentProductResponse.data as any)?.product;

      if (!currentProduct) {
        throw new Error('Product not found on server');
      }

      // Handle conflict: if server stock differs from expected oldStock, adjust
      const serverStock = currentProduct.stock || 0;
      const expectedOldStock = change.oldStock;
      
      if (Math.abs(serverStock - expectedOldStock) > 0.01) {
        // Conflict detected - server stock differs from what we expected
        // This can happen if:
        // 1. Another sale was processed between local update and sync
        // 2. Stock was manually adjusted on server
        // 3. Local stock calculation was incorrect
        
        // Calculate the actual change amount
        const actualChange = change.change; // This is newStock - oldStock (can be negative for sales)
        
        // Apply the change to the actual server stock
        const adjustedNewStock = Math.max(0, serverStock + actualChange);
        
        logger.warn(
          `⚠️ Stock conflict for ${change.productName}: expected old stock ${expectedOldStock}, server has ${serverStock}. ` +
          `Applying change of ${actualChange} to server stock: ${serverStock} -> ${adjustedNewStock}`
        );
        
        // Update with adjusted stock based on actual server stock
        await productsApi.updateProduct(change.productId, {
          ...currentProduct,
          stock: adjustedNewStock,
        });
        
        // Update local IndexedDB to match server (use adjusted value)
        await productsDB.updateProductStock(change.productId, adjustedNewStock);
      } else {
        // No conflict - apply change directly
        await productsApi.updateProduct(change.productId, {
          ...currentProduct,
          stock: change.newStock,
        });
        
        // Update local IndexedDB to match server
        await productsDB.updateProductStock(change.productId, change.newStock);
      }

      logger.debug(`✅ Stock synced for ${change.productName}: ${change.oldStock} -> ${change.newStock}`);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      logger.error(`❌ Failed to sync stock change for ${change.productName}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Notify that a stock change occurred (event-driven)
   */
  private notifyStockChange(): void {
    this.hasUnsyncedChanges = true;
    this.triggerSync();
  }

  /**
   * Check if there are unsynced changes and sync if needed
   */
  private async checkAndSyncIfNeeded(): Promise<void> {
    try {
      const unsyncedCount = await this.getUnsyncedCount();
      if (unsyncedCount > 0) {
        this.hasUnsyncedChanges = true;
        this.triggerSync();
      } else {
        this.hasUnsyncedChanges = false;
      }
    } catch (error) {
      logger.error('Error checking unsynced stock changes:', error);
    }
  }

  /**
   * Sync all unsynced stock changes (internal, called via queue)
   */
  private async syncUnsyncedChangesInternal(): Promise<SyncResult> {
    // Check if online
    if (!navigator.onLine) {
      logger.debug('📴 Offline, skipping inventory sync');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    try {
      const unsyncedChanges = await this.getUnsyncedChanges();

      if (unsyncedChanges.length === 0) {
        this.hasUnsyncedChanges = false;
        return { success: true, synced: 0, failed: 0, errors: [] };
      }

      logger.debug(`🔄 Syncing ${unsyncedChanges.length} unsynced stock changes...`);

      const results: SyncResult = {
        success: true,
        synced: 0,
        failed: 0,
        errors: [],
      };

      // Group changes by productId to merge consecutive changes
      const changesByProduct = new Map<string, StockChange[]>();
      unsyncedChanges.forEach(change => {
        const existing = changesByProduct.get(change.productId) || [];
        existing.push(change);
        changesByProduct.set(change.productId, existing);
      });

      // Sync each product's changes (merged)
      for (const [productId, changes] of changesByProduct.entries()) {
        // Merge consecutive changes for the same product
        // Calculate final stock change
        const totalChange = changes.reduce((sum, change) => sum + change.change, 0);
        const firstChange = changes[0];
        const finalNewStock = firstChange.oldStock + totalChange;

        // Create a merged change
        const mergedChange: StockChange = {
          ...firstChange,
          id: `merged_${productId}_${Date.now()}`,
          newStock: finalNewStock,
          change: totalChange,
        };

        const syncResult = await this.syncStockChange(mergedChange);

        if (syncResult.success) {
          // Mark all original changes as synced
          for (const change of changes) {
            await this.markAsSynced(change.id);
            // Clean up after successful sync (optional - can keep for audit)
            // await this.deleteChange(change.id);
          }
          results.synced += changes.length;
        } else {
          // Mark as failed
          for (const change of changes) {
            await this.markSyncError(change.id, syncResult.error || 'Sync failed');
          }
          results.failed += changes.length;
          results.errors.push({
            productId,
            error: syncResult.error || 'Unknown error',
          });
        }

        // Small delay between syncs
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      logger.debug(`✅ Inventory sync completed: ${results.synced} synced, ${results.failed} failed`);

      // Update flag based on result
      this.hasUnsyncedChanges = results.failed > 0;

      return results;
    } catch (error: any) {
      logger.error('❌ Error during inventory sync:', error);
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [{ productId: 'unknown', error: error?.message || 'Unknown error' }],
      };
    }
  }

  /**
   * Sync all unsynced stock changes (public API, uses queue)
   */
  async syncUnsyncedChanges(): Promise<SyncResult> {
    // Check if there are actually unsynced changes before queuing
    const unsyncedCount = await this.getUnsyncedCount();
    if (unsyncedCount === 0) {
      this.hasUnsyncedChanges = false;
      return { success: true, synced: 0, failed: 0, errors: [] };
    }

    // Add to queue for sequential processing
    return syncQueue.enqueue(() => this.syncUnsyncedChangesInternal(), 1);
  }

  /**
   * Trigger sync (adds to queue, debounced)
   */
  private triggerSync(): void {
    if (!navigator.onLine) {
      logger.debug('📴 Offline, skipping inventory sync trigger');
      return;
    }

    // Use debounced sync to batch rapid changes
    this.debouncedSync();
  }

  /**
   * Internal method to trigger sync (used by debounced function)
   */
  private async _doSyncInternal(): Promise<void> {
    // Only sync if we know there are unsynced changes, or check first time
    if (!this.hasUnsyncedChanges) {
      await this.checkAndSyncIfNeeded();
      return;
    }

    // Add to queue
    syncQueue.enqueue(() => this.syncUnsyncedChangesInternal(), 1).catch((error) => {
      logger.error('Error in queued inventory sync:', error);
    });
  }


  /**
   * Initialize sync service with event listeners (event-driven, no periodic polling)
   */
  async initService(): Promise<void> {
    try {
      await this.init();
      logger.info('✅ Inventory sync service initialized');

      // Create debounced sync function (batches rapid changes within 1.5 seconds)
      this.debouncedSync = debounce(() => {
        this._doSyncInternal();
      }, 1500);

      // Sync on online event
      window.addEventListener('online', () => {
        this.triggerSync();
      });

      // Sync on page visibility change
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && navigator.onLine) {
          this.triggerSync();
        }
      });

      // Initial check for unsynced changes (only once on init)
      this.checkAndSyncIfNeeded();
    } catch (error) {
      logger.warn('⚠️ Inventory sync service initialization failed:', error);
    }
  }

  /**
   * Get count of unsynced changes
   */
  async getUnsyncedCount(): Promise<number> {
    const changes = await this.getUnsyncedChanges();
    return changes.length;
  }
}

// Export singleton instance
export const inventorySync = new InventorySyncService();

// Export types
export type { StockChange, SyncResult };

