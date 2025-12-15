// IndexedDB utility for product storage and search
// Handles large product datasets efficiently with fast local search

import { openIndexedDB, isIndexedDBAvailable } from './indexedDBUtils';

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

    // Check if IndexedDB is available
    if (!isIndexedDBAvailable()) {
      this.initPromise = Promise.reject(
        new Error('IndexedDB is not available in this browser')
      );
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = openIndexedDB(this.dbName, this.version);

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
   * Normalize product ID to ensure consistent key generation
   * Handles both id and _id fields, prioritizing id
   */
  private normalizeProductId(product: any): string {
    // Normalize the product to ensure consistent ID field
    const productId = product.id || product._id;
    if (!productId) {
      console.warn('[ProductsDB] Product missing ID:', product);
      return '';
    }
    return String(productId);
  }

  /**
   * Generate product record ID
   */
  private getProductId(product: any, storeId: string): string {
    const productId = this.normalizeProductId(product);
    if (!productId) {
      throw new Error('Product ID is required');
    }
    return `${storeId}_${productId}`;
  }

  /**
   * Store products in IndexedDB
   * Clears existing products for the store before storing new ones to prevent duplicates
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

    if (!products || products.length === 0) {
      console.warn('[ProductsDB] No products to store');
      return;
    }

    // Normalize products to ensure consistent ID fields
    const normalizedProducts = products.map((product) => {
      // Ensure product has a consistent id field (prefer id over _id)
      const normalizedId = this.normalizeProductId(product);
      if (!normalizedId) {
        console.warn('[ProductsDB] Skipping product without ID:', product);
        return null;
      }
      return {
        ...product,
        id: normalizedId, // Ensure id field exists
        _id: normalizedId, // Also set _id for consistency
      };
    }).filter((p): p is any => p !== null);

    // Deduplicate products by ID within the batch
    const productMap = new Map<string, any>();
    normalizedProducts.forEach((product) => {
      const productId = this.normalizeProductId(product);
      if (productId) {
        // Keep the most recent version if duplicates exist in the batch
        productMap.set(productId, product);
      }
    });

    const uniqueProducts = Array.from(productMap.values());
    console.log(`[ProductsDB] Storing ${uniqueProducts.length} unique products (${products.length} input, ${products.length - uniqueProducts.length} duplicates removed)`);

    // Clear existing products for this store before storing new ones
    // This prevents accumulation of duplicates from multiple syncs
    await this.clearProducts();

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const objectStore = transaction.objectStore(this.storeName);
    const now = Date.now();

    // Store all products
    const promises = uniqueProducts.map((product) => {
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
    console.log(`[ProductsDB] Stored ${uniqueProducts.length} products in IndexedDB`);
  }

  /**
   * Store a single product
   * Normalizes the product ID to ensure consistent key generation
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

    // Normalize product to ensure consistent ID field
    const normalizedId = this.normalizeProductId(product);
    if (!normalizedId) {
      throw new Error('Product ID is required');
    }

    const normalizedProduct = {
      ...product,
      id: normalizedId, // Ensure id field exists
      _id: normalizedId, // Also set _id for consistency
    };

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const objectStore = transaction.objectStore(this.storeName);
    const id = this.getProductId(normalizedProduct, storeId);
    const record: ProductRecord = {
      id,
      product: normalizedProduct,
      storeId,
      lastUpdated: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = objectStore.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[ProductsDB] Stored product: ${normalizedProduct.name || normalizedId}`);
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
   * Normalizes the productId to ensure consistent lookup
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

    // Normalize productId to string
    const normalizedId = String(productId);
    const id = `${storeId}_${normalizedId}`;

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
   * Normalizes the productId to ensure consistent lookup
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

    // Normalize productId to string
    const normalizedId = String(productId);
    const id = `${storeId}_${normalizedId}`;

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
            console.log(`[ProductsDB] Updated stock for product ${normalizedId}: ${newStock}`);
            resolve();
          };
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error(`Product ${normalizedId} not found in database`));
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Delete a product from IndexedDB
   * Normalizes the productId to ensure consistent deletion
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

    // Normalize productId to string
    const normalizedId = String(productId);
    const id = `${storeId}_${normalizedId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        console.log(`[ProductsDB] Deleted product ${normalizedId}`);
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
   * Deduplicate products in IndexedDB
   * Removes duplicate products based on product ID (not IndexedDB key)
   * Keeps the most recently updated version of each product
   */
  async deduplicateProducts(): Promise<{ removed: number; kept: number }> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      throw new Error('Store ID not found');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index(this.indexName);
      const request = index.getAll(storeId);

      request.onsuccess = () => {
        const records = request.result as ProductRecord[];
        
        // Group records by normalized product ID
        const productMap = new Map<string, ProductRecord>();
        const duplicatesToDelete: string[] = [];

        records.forEach((record) => {
          const productId = this.normalizeProductId(record.product);
          if (!productId) {
            // Invalid product, mark for deletion
            duplicatesToDelete.push(record.id);
            return;
          }

          const existing = productMap.get(productId);
          if (!existing) {
            // First occurrence of this product ID
            productMap.set(productId, record);
          } else {
            // Duplicate found - keep the one with the most recent lastUpdated
            if (record.lastUpdated > existing.lastUpdated) {
              // Current record is newer, delete the old one
              duplicatesToDelete.push(existing.id);
              productMap.set(productId, record);
            } else {
              // Existing record is newer, delete current one
              duplicatesToDelete.push(record.id);
            }
          }
        });

        // Delete duplicates
        let deletedCount = 0;
        const deletePromises = duplicatesToDelete.map((id) => {
          return new Promise<void>((resolveDelete) => {
            const deleteRequest = objectStore.delete(id);
            deleteRequest.onsuccess = () => {
              deletedCount++;
              resolveDelete();
            };
            deleteRequest.onerror = () => resolveDelete(); // Continue even if one fails
          });
        });

        Promise.all(deletePromises).then(() => {
          const result = {
            removed: deletedCount,
            kept: productMap.size,
          };
          console.log(`[ProductsDB] Deduplication complete: Removed ${result.removed} duplicates, kept ${result.kept} unique products`);
          resolve(result);
        });
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

