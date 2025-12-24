/**
 * Inventory synchronization service
 * Handles offline stock updates and syncs with backend when online
 */

import { productsApi, ApiError } from '../api/client';
import { productsDB } from '../db/productsDB';

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
  private isSyncing = false;
  private syncInterval: number | null = null;
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
        console.error('Failed to open Inventory Sync IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Inventory sync service initialized');
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
        console.log(`📦 Queued stock change for ${productName}: ${oldStock} -> ${newStock} (${change > 0 ? '+' : ''}${change})`);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to queue stock change:', request.error);
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
        
        console.warn(
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

      console.log(`✅ Stock synced for ${change.productName}: ${change.oldStock} -> ${change.newStock}`);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      console.error(`❌ Failed to sync stock change for ${change.productName}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Sync all unsynced stock changes
   */
  async syncUnsyncedChanges(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('⏳ Inventory sync already in progress, skipping...');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    // Check if online
    if (!navigator.onLine) {
      console.log('📴 Offline, skipping inventory sync');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    this.isSyncing = true;

    try {
      const unsyncedChanges = await this.getUnsyncedChanges();
      console.log(`🔄 Syncing ${unsyncedChanges.length} unsynced stock changes...`);

      if (unsyncedChanges.length === 0) {
        this.isSyncing = false;
        return { success: true, synced: 0, failed: 0, errors: [] };
      }

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

      console.log(`✅ Inventory sync completed: ${results.synced} synced, ${results.failed} failed`);
      this.isSyncing = false;
      return results;
    } catch (error: any) {
      console.error('❌ Error during inventory sync:', error);
      this.isSyncing = false;
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [{ productId: 'unknown', error: error?.message || 'Unknown error' }],
      };
    }
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = window.setInterval(() => {
      this.syncUnsyncedChanges().catch((error) => {
        console.error('Error in periodic inventory sync:', error);
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
   * Initialize sync service with event listeners
   */
  async initService(): Promise<void> {
    try {
      await this.init();
      console.log('✅ Inventory sync service initialized');

      // Start periodic sync (every 30 seconds)
      this.startPeriodicSync(30000);

      // Sync on online event
      window.addEventListener('online', () => {
        this.syncUnsyncedChanges().catch((error) => {
          console.error('Error syncing on online event:', error);
        });
      });

      // Sync on page visibility change
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && navigator.onLine) {
          this.syncUnsyncedChanges().catch((error) => {
            console.error('Error syncing on visibility change:', error);
          });
        }
      });
    } catch (error) {
      console.warn('⚠️ Inventory sync service initialization failed:', error);
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

