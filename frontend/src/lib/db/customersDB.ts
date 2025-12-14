// IndexedDB utility for customer storage and search
// Handles customer data efficiently with fast local search

interface CustomerRecord {
  id: string;
  customer: any;
  storeId: string;
  lastUpdated: number;
}

class CustomersDB {
  private dbName = 'POS_CustomersDB';
  private version = 1;
  private storeName = 'customers';
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
        console.error('[CustomersDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[CustomersDB] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          objectStore.createIndex(this.indexName, 'storeId', { unique: false });
          objectStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          // Create index on phone for fast lookups
          objectStore.createIndex('phone', 'customer.phone', { unique: false });
          console.log('[CustomersDB] Object store created');
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
      console.error('[CustomersDB] Error getting storeId from token:', error);
      return null;
    }
  }

  private getCustomerId(customer: any, storeId: string): string {
    const customerId = String(customer.id || customer._id || '');
    return `${storeId}_${customerId}`;
  }

  async storeCustomers(customers: any[]): Promise<void> {
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

    const promises = customers.map((customer) => {
      const id = this.getCustomerId(customer, storeId);
      const record: CustomerRecord = {
        id,
        customer,
        storeId,
        lastUpdated: now,
      };
      return objectStore.put(record);
    });

    await Promise.all(promises);
    console.log(`[CustomersDB] Stored ${customers.length} customers`);
  }

  async storeCustomer(customer: any): Promise<void> {
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
    const id = this.getCustomerId(customer, storeId);
    const record: CustomerRecord = {
      id,
      customer,
      storeId,
      lastUpdated: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = objectStore.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[CustomersDB] Stored customer: ${customer.name || customer.id}`);
  }

  async getAllCustomers(): Promise<any[]> {
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
        const customers = request.result.map((record: CustomerRecord) => record.customer);
        resolve(customers);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getCustomer(customerId: string | number): Promise<any | null> {
    await this.init();
    if (!this.db) {
      return null;
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      return null;
    }

    const id = `${storeId}_${customerId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(id);

      request.onsuccess = () => {
        const record = request.result as CustomerRecord | undefined;
        resolve(record ? record.customer : null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async searchCustomers(searchTerm: string): Promise<any[]> {
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
        const records = request.result as CustomerRecord[];
        const searchLower = searchTerm.toLowerCase();
        
        const customers = records
          .map((record) => record.customer)
          .filter((customer) => {
            const name = (customer.name || '').toLowerCase();
            const phone = (customer.phone || '').toLowerCase();
            const address = (customer.address || '').toLowerCase();
            
            return name.includes(searchLower) || 
                   phone.includes(searchLower) || 
                   address.includes(searchLower);
          });
        
        resolve(customers);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async deleteCustomer(customerId: string | number): Promise<void> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const storeId = this.getStoreId();
    if (!storeId) {
      throw new Error('Store ID not found');
    }

    const id = `${storeId}_${customerId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        console.log(`[CustomersDB] Deleted customer ${customerId}`);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async clearCustomers(): Promise<void> {
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
          console.log('[CustomersDB] Cleared all customers');
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
      localStorage.setItem(`customers_db_changed_${storeId}`, Date.now().toString());
      setTimeout(() => {
        localStorage.removeItem(`customers_db_changed_${storeId}`);
      }, 100);
    } catch (error) {
      console.warn('[CustomersDB] Failed to notify other tabs:', error);
    }

    try {
      const channel = new BroadcastChannel('customers_db_channel');
      channel.postMessage({
        type: 'customers_changed',
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

export const customersDB = new CustomersDB();
