// IndexedDB utility for unit storage and search
// Handles unit data efficiently with fast local search

import { openIndexedDB, isIndexedDBAvailable } from './indexedDBUtils';

interface UnitRecord {
  id: string;
  unit: any;
  storeId: string;
  lastUpdated: number;
}

class UnitsDB {
  private dbName = 'POS_UnitsDB';
  private version = 1;
  private storeName = 'units';
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
        console.error('[UnitsDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[UnitsDB] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          objectStore.createIndex(this.indexName, 'storeId', { unique: false });
          objectStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          console.log('[UnitsDB] Object store created');
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
      console.error('[UnitsDB] Error getting storeId from token:', error);
      return null;
    }
  }

  private getUnitId(unit: any, storeId: string): string {
    const unitId = String(unit.id || unit._id || '');
    return `${storeId}_${unitId}`;
  }

  async storeUnits(units: any[]): Promise<void> {
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

    const promises = units.map((unit) => {
      const id = this.getUnitId(unit, storeId);
      const record: UnitRecord = {
        id,
        unit,
        storeId,
        lastUpdated: now,
      };
      return objectStore.put(record);
    });

    await Promise.all(promises);
    console.log(`[UnitsDB] Stored ${units.length} units`);
  }

  async storeUnit(unit: any): Promise<void> {
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
    const id = this.getUnitId(unit, storeId);
    const record: UnitRecord = {
      id,
      unit,
      storeId,
      lastUpdated: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = objectStore.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[UnitsDB] Stored unit: ${unit.name || unit.id}`);
  }

  async getAllUnits(): Promise<any[]> {
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
        const units = request.result.map((record: UnitRecord) => record.unit);
        resolve(units);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getUnit(unitId: string | number): Promise<any | null> {
    await this.init();
    if (!this.db) {
      return null;
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      return null;
    }

    const id = `${storeId}_${unitId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(id);

      request.onsuccess = () => {
        const record = request.result as UnitRecord | undefined;
        resolve(record ? record.unit : null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async deleteUnit(unitId: string | number): Promise<void> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      throw new Error('Store ID not found');
    }

    const id = `${storeId}_${unitId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        console.log(`[UnitsDB] Deleted unit ${unitId}`);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async clearUnits(): Promise<void> {
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
          console.log('[UnitsDB] Cleared all units');
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
      localStorage.setItem(`units_db_changed_${storeId}`, Date.now().toString());
      setTimeout(() => {
        localStorage.removeItem(`units_db_changed_${storeId}`);
      }, 100);
    } catch (error) {
      console.warn('[UnitsDB] Failed to notify other tabs:', error);
    }

    try {
      const channel = new BroadcastChannel('units_db_channel');
      channel.postMessage({
        type: 'units_changed',
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

export const unitsDB = new UnitsDB();

