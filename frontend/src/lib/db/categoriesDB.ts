// IndexedDB utility for category storage and search
// Handles category data efficiently with fast local search

interface CategoryRecord {
  id: string;
  category: any;
  storeId: string;
  lastUpdated: number;
}

class CategoriesDB {
  private dbName = 'POS_CategoriesDB';
  private version = 1;
  private storeName = 'categories';
  private indexName = 'storeId';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.db) {
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('[CategoriesDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[CategoriesDB] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          // Create index on storeId for fast queries
          objectStore.createIndex(this.indexName, 'storeId', { unique: false });
          // Create index on lastUpdated for cache management
          objectStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          console.log('[CategoriesDB] Object store created');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get store ID from auth token
   */
  private getStoreId(): string | null {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        return null;
      }
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.storeId || null;
    } catch (error) {
      console.error('[CategoriesDB] Error getting storeId from token:', error);
      return null;
    }
  }

  /**
   * Generate category record ID
   */
  private getCategoryId(category: any, storeId: string): string {
    const categoryId = String(category.id || category._id || '');
    return `${storeId}_${categoryId}`;
  }

  /**
   * Store categories in IndexedDB
   */
  async storeCategories(categories: any[]): Promise<void> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      throw new Error('Store ID not found');
    }

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const objectStore = transaction.objectStore(this.storeName);
    const now = Date.now();

    // Store all categories
    const promises = categories.map((category) => {
      const id = this.getCategoryId(category, storeId);
      const record: CategoryRecord = {
        id,
        category,
        storeId,
        lastUpdated: now,
      };
      return objectStore.put(record);
    });

    await Promise.all(promises);
    console.log(`[CategoriesDB] Stored ${categories.length} categories`);
  }

  /**
   * Store a single category
   */
  async storeCategory(category: any): Promise<void> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      throw new Error('Store ID not found');
    }

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const objectStore = transaction.objectStore(this.storeName);
    const id = this.getCategoryId(category, storeId);
    const record: CategoryRecord = {
      id,
      category,
      storeId,
      lastUpdated: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = objectStore.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[CategoriesDB] Stored category: ${category.name || category.id}`);
  }

  /**
   * Get all categories for current store
   */
  async getAllCategories(): Promise<any[]> {
    await this.init();
    if (!this.db) {
      return [];
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index(this.indexName);
      const request = index.getAll(storeId);

      request.onsuccess = () => {
        const categories = request.result.map((record: CategoryRecord) => record.category);
        resolve(categories);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get a single category by ID
   */
  async getCategory(categoryId: string | number): Promise<any | null> {
    await this.init();
    if (!this.db) {
      return null;
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      return null;
    }

    const id = `${storeId}_${categoryId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(id);

      request.onsuccess = () => {
        const record = request.result as CategoryRecord | undefined;
        resolve(record ? record.category : null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Delete a category from IndexedDB
   */
  async deleteCategory(categoryId: string | number): Promise<void> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      throw new Error('Store ID not found');
    }

    const id = `${storeId}_${categoryId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        console.log(`[CategoriesDB] Deleted category ${categoryId}`);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Clear all categories for current store
   */
  async clearCategories(): Promise<void> {
    await this.init();
    if (!this.db) {
      return;
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index(this.indexName);
      const request = index.openKeyCursor(IDBKeyRange.only(storeId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          objectStore.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          console.log('[CategoriesDB] Cleared all categories');
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Notify other tabs of changes
   */
  notifyOtherTabs(): void {
    const storeId = this.getStoreId();
    if (!storeId) {
      return;
    }

    // Use localStorage as a signal
    try {
      localStorage.setItem(`categories_db_changed_${storeId}`, Date.now().toString());
      setTimeout(() => {
        localStorage.removeItem(`categories_db_changed_${storeId}`);
      }, 100);
    } catch (error) {
      console.warn('[CategoriesDB] Failed to notify other tabs:', error);
    }

    // Use BroadcastChannel if available
    try {
      const channel = new BroadcastChannel('categories_db_channel');
      channel.postMessage({
        type: 'categories_changed',
        storeId,
        timestamp: Date.now(),
      });
    } catch (error) {
      // BroadcastChannel not supported, that's okay
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Export singleton instance
export const categoriesDB = new CategoriesDB();

