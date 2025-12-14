// IndexedDB utility for product storage and search
// Handles large product datasets efficiently with fast local search

interface ProductRecord {
  id: string;
  product: any;
  storeId: string;
  lastUpdated: number;
}

interface SearchOptions {
  searchTerm?: string;
  category?: string;
  brand?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

class ProductsDB {
  private dbName = 'POS_ProductsDB';
  private version = 1;
  private storeName = 'products';
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
        console.error('[ProductsDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[ProductsDB] Database opened successfully');
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
          console.log('[ProductsDB] Object store created');
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
      console.error('[ProductsDB] Error getting storeId from token:', error);
      return null;
    }
  }

  /**
   * Generate product record ID
   */
  private getProductId(product: any, storeId: string): string {
    const productId = String(product.id || product._id || '');
    return `${storeId}_${productId}`;
  }

  /**
   * Store products in IndexedDB
   */
  async storeProducts(products: any[]): Promise<void> {
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

    // Store all products
    const promises = products.map((product) => {
      const id = this.getProductId(product, storeId);
      const record: ProductRecord = {
        id,
        product,
        storeId,
        lastUpdated: now,
      };
      return objectStore.put(record);
    });

    await Promise.all(promises);
    console.log(`[ProductsDB] Stored ${products.length} products`);
  }

  /**
   * Store a single product
   */
  async storeProduct(product: any): Promise<void> {
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
    const id = this.getProductId(product, storeId);
    const record: ProductRecord = {
      id,
      product,
      storeId,
      lastUpdated: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = objectStore.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[ProductsDB] Stored product: ${product.name || product.id}`);
  }

  /**
   * Get all products for current store
   */
  async getAllProducts(): Promise<any[]> {
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
        const products = request.result.map((record: ProductRecord) => record.product);
        resolve(products);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get the last update timestamp for products in IndexedDB
   * Returns the most recent lastUpdated timestamp, or 0 if no products exist
   */
  async getLastUpdateTime(): Promise<number> {
    await this.init();
    if (!this.db) {
      return 0;
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      return 0;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index(this.indexName);
      const request = index.getAll(storeId);

      request.onsuccess = () => {
        const records = request.result as ProductRecord[];
        if (records.length === 0) {
          resolve(0);
          return;
        }
        
        // Find the most recent lastUpdated timestamp
        const maxTimestamp = Math.max(...records.map(r => r.lastUpdated || 0));
        resolve(maxTimestamp);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Check if IndexedDB data is fresh (updated within the specified time)
   * @param maxAge Maximum age in milliseconds (default: 5 minutes)
   */
  async isDataFresh(maxAge: number = 5 * 60 * 1000): Promise<boolean> {
    const lastUpdate = await this.getLastUpdateTime();
    if (lastUpdate === 0) {
      return false; // No data in IndexedDB
    }
    
    const age = Date.now() - lastUpdate;
    return age < maxAge;
  }

  /**
   * Get a single product by ID
   */
  async getProduct(productId: string | number): Promise<any | null> {
    await this.init();
    if (!this.db) {
      return null;
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      return null;
    }

    const id = `${storeId}_${productId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(id);

      request.onsuccess = () => {
        const record = request.result as ProductRecord | undefined;
        resolve(record ? record.product : null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Search products in IndexedDB
   */
  async searchProducts(options: SearchOptions = {}): Promise<any[]> {
    await this.init();
    if (!this.db) {
      return [];
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      return [];
    }

    const {
      searchTerm = '',
      category,
      brand,
      status,
      limit = 1000,
      offset = 0,
    } = options;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index(this.indexName);
      const request = index.getAll(storeId);

      request.onsuccess = () => {
        const records = request.result as ProductRecord[];
        let products = records.map((record) => record.product);

        // Apply filters
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          products = products.filter((product) => {
            const name = (product.name || '').toLowerCase();
            const barcode = (product.barcode || product.primaryBarcode || '').toLowerCase();
            const sku = (product.sku || product.internalSKU || '').toLowerCase();
            
            // Check product name
            if (name.includes(searchLower)) return true;
            
            // Check barcode
            if (barcode.includes(searchLower)) return true;
            
            // Check SKU
            if (sku.includes(searchLower)) return true;
            
            // Check unit barcodes if available
            if (product.units) {
              return product.units.some((unit: any) => {
                const unitBarcode = (unit.barcode || '').toLowerCase();
                return unitBarcode.includes(searchLower);
              });
            }
            
            return false;
          });
        }

        if (category) {
          products = products.filter((product) => {
            const productCategory = product.category?.nameAr || 
                                   product.category?.name || 
                                   product.category ||
                                   '';
            return productCategory === category;
          });
        }

        if (brand) {
          products = products.filter((product) => {
            const productBrand = product.brand?.name || 
                               product.brand ||
                               '';
            return productBrand === brand;
          });
        }

        if (status) {
          products = products.filter((product) => {
            return product.status === status;
          });
        }

        // Apply pagination
        const paginatedProducts = products.slice(offset, offset + limit);
        resolve(paginatedProducts);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Update product stock in IndexedDB
   */
  async updateProductStock(productId: string | number, newStock: number): Promise<void> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      throw new Error('Store ID not found');
    }

    const id = `${storeId}_${productId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const getRequest = objectStore.get(id);

      getRequest.onsuccess = () => {
        const record = getRequest.result as ProductRecord | undefined;
        if (record) {
          record.product.stock = newStock;
          record.lastUpdated = Date.now();
          const putRequest = objectStore.put(record);
          putRequest.onsuccess = () => {
            console.log(`[ProductsDB] Updated stock for product ${productId}: ${newStock}`);
            resolve();
          };
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error(`Product ${productId} not found in database`));
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Delete a product from IndexedDB
   */
  async deleteProduct(productId: string | number): Promise<void> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      throw new Error('Store ID not found');
    }

    const id = `${storeId}_${productId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        console.log(`[ProductsDB] Deleted product ${productId}`);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Clear all products for current store
   */
  async clearProducts(): Promise<void> {
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
          console.log('[ProductsDB] Cleared all products');
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get count of products
   */
  async getProductCount(): Promise<number> {
    await this.init();
    if (!this.db) {
      return 0;
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      return 0;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index(this.indexName);
      const request = index.count(IDBKeyRange.only(storeId));

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Listen for changes in other tabs (multi-tab support)
   */
  onProductsChanged(callback: (event: Event) => void): () => void {
    if (!this.db) {
      this.init().then(() => {
        if (this.db) {
          this.setupChangeListener(callback);
        }
      });
    } else {
      this.setupChangeListener(callback);
    }

    // Return cleanup function
    return () => {
      // Cleanup if needed
    };
  }

  private setupChangeListener(callback: (event: Event) => void): void {
    // Listen for storage events (for cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('products_db_changed_')) {
        callback(e);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also use BroadcastChannel for better cross-tab communication
    try {
      const channel = new BroadcastChannel('products_db_channel');
      channel.onmessage = (event) => {
        if (event.data.type === 'products_changed') {
          callback(event as any);
        }
      };
    } catch (error) {
      console.warn('[ProductsDB] BroadcastChannel not supported, using storage events only');
    }
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
      localStorage.setItem(`products_db_changed_${storeId}`, Date.now().toString());
      // Remove after a short delay to allow other tabs to detect it
      setTimeout(() => {
        localStorage.removeItem(`products_db_changed_${storeId}`);
      }, 100);
    } catch (error) {
      console.warn('[ProductsDB] Failed to notify other tabs:', error);
    }

    // Use BroadcastChannel if available
    try {
      const channel = new BroadcastChannel('products_db_channel');
      channel.postMessage({
        type: 'products_changed',
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
export const productsDB = new ProductsDB();

