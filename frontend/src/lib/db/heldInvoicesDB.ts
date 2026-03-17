import { openIndexedDB, isIndexedDBAvailable } from './indexedDBUtils';
import { POSInvoice } from '@/shared/types';
import { getStoreIdFromToken } from '@/lib/utils/storeId';

export type HeldInvoice = POSInvoice & { heldKey: string };

interface HeldInvoiceRecord {
  id: string;
  storeId: string;
  invoice: Omit<HeldInvoice, 'date'> & { date: string };
  lastUpdated: number;
}

const DB_NAME = 'POS_HeldInvoices_DB';
const DB_VERSION = 1;
const STORE_NAME = 'held_invoices';

class HeldInvoicesDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    if (!isIndexedDBAvailable()) {
      this.initPromise = Promise.reject(new Error('IndexedDB is not available in this browser'));
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = openIndexedDB(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[HeldInvoicesDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[HeldInvoicesDB] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('storeId', 'storeId', { unique: false });
          store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize HeldInvoicesDB');
    }
    return this.db;
  }

  private getStoreId(): string | null {
    return getStoreIdFromToken();
  }

  private getRecordId(storeId: string, heldKey: string): string {
    return `${storeId}_${heldKey}`;
  }

  async getAllHeldInvoices(storeIdOverride?: string): Promise<HeldInvoice[]> {
    const db = await this.ensureDB();
    const storeId = (storeIdOverride || this.getStoreId()) ?? null;
    if (!storeId) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('storeId');
      const request = index.getAll(storeId);

      request.onsuccess = () => {
        const records = (request.result as HeldInvoiceRecord[]) || [];
        const invoices: HeldInvoice[] = records.map((r) => {
          const inv = r.invoice as unknown as HeldInvoice;
          const rawDate: any = (r.invoice as any).date;
          const parsedDate =
            typeof rawDate === 'string' || rawDate instanceof Date
              ? new Date(rawDate)
              : new Date();
          return {
            ...inv,
            date: parsedDate,
          };
        });
        resolve(invoices);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async saveHeldInvoices(storeIdOverride: string, invoices: HeldInvoice[]): Promise<void> {
    const db = await this.ensureDB();
    const storeId = storeIdOverride || this.getStoreId();
    if (!storeId) {
      throw new Error('Store ID not found for HeldInvoicesDB');
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const index = store.index('storeId');
      const request = index.getAllKeys(storeId);

      request.onsuccess = () => {
        const keys = (request.result as string[]) || [];
        keys.forEach((key) => {
          store.delete(key);
        });
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    const now = Date.now();
    const puts = invoices.map((invoice) => {
      const id = this.getRecordId(storeId, invoice.heldKey);
      const record: HeldInvoiceRecord = {
        id,
        storeId,
        invoice: {
          ...invoice,
          date: invoice.date instanceof Date ? invoice.date.toISOString() : invoice.date,
        },
        lastUpdated: now,
      };
      return new Promise<void>((resolve, reject) => {
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(puts);
  }
}

export const heldInvoicesDB = new HeldInvoicesDB();

