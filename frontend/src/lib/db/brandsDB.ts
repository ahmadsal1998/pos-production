// IndexedDB utility for brand storage and search
// Handles brand data efficiently with fast local search

interface BrandRecord {
  id: string;
  brand: any;
  storeId: string;
  lastUpdated: number;
}

class BrandsDB {
  private dbName = 'POS_BrandsDB';
  private version = 1;
  private storeName = 'brands';
  private indexName = 'storeId';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

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
        console.error('[BrandsDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[BrandsDB] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          objectStore.createIndex(this.indexName, 'storeId', { unique: false });
          objectStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          console.log('[BrandsDB] Object store created');
        }
      };
    });

    return this.initPromise;
  }

  private getStoreId(): string | null {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        return null;
      }
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.storeId || null;
    } catch (error) {
      console.error('[BrandsDB] Error getting storeId from token:', error);
      return null;
    }
  }

  private getBrandId(brand: any, storeId: string): string {
    const brandId = String(brand.id || brand._id || '');
    return `${storeId}_${brandId}`;
  }

  async storeBrands(brands: any[]): Promise<void> {
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

    const promises = brands.map((brand) => {
      const id = this.getBrandId(brand, storeId);
      const record: BrandRecord = {
        id,
        brand,
        storeId,
        lastUpdated: now,
      };
      return objectStore.put(record);
    });

    await Promise.all(promises);
    console.log(`[BrandsDB] Stored ${brands.length} brands`);
  }

  async storeBrand(brand: any): Promise<void> {
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
    const id = this.getBrandId(brand, storeId);
    const record: BrandRecord = {
      id,
      brand,
      storeId,
      lastUpdated: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = objectStore.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[BrandsDB] Stored brand: ${brand.name || brand.id}`);
  }

  async getAllBrands(): Promise<any[]> {
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
        const brands = request.result.map((record: BrandRecord) => record.brand);
        resolve(brands);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getBrand(brandId: string | number): Promise<any | null> {
    await this.init();
    if (!this.db) {
      return null;
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      return null;
    }

    const id = `${storeId}_${brandId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(id);

      request.onsuccess = () => {
        const record = request.result as BrandRecord | undefined;
        resolve(record ? record.brand : null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async deleteBrand(brandId: string | number): Promise<void> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      throw new Error('Store ID not found');
    }

    const id = `${storeId}_${brandId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        console.log(`[BrandsDB] Deleted brand ${brandId}`);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async clearBrands(): Promise<void> {
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
          console.log('[BrandsDB] Cleared all brands');
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  notifyOtherTabs(): void {
    const storeId = this.getStoreId();
    if (!storeId) {
      return;
    }

    try {
      localStorage.setItem(`brands_db_changed_${storeId}`, Date.now().toString());
      setTimeout(() => {
        localStorage.removeItem(`brands_db_changed_${storeId}`);
      }, 100);
    } catch (error) {
      console.warn('[BrandsDB] Failed to notify other tabs:', error);
    }

    try {
      const channel = new BroadcastChannel('brands_db_channel');
      channel.postMessage({
        type: 'brands_changed',
        storeId,
        timestamp: Date.now(),
      });
    } catch (error) {
      // BroadcastChannel not supported
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

export const brandsDB = new BrandsDB();

