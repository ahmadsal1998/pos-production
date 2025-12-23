/**
 * IndexedDB service for sales caching
 * Provides fast local access to sales data and sync with backend
 */

import { openIndexedDB, isIndexedDBAvailable } from './indexedDBUtils';
import { getBusinessDateFilterRange, getBusinessDayStartTime, getBusinessDayTimezone } from '@/shared/utils/businessDate';

const DB_NAME = 'POS_Sales_DB';
const DB_VERSION = 1;
const STORE_NAME = 'sales';
const SYNC_STORE_NAME = 'sync_queue';

interface SaleRecord {
  id?: string;
  _id?: string;
  invoiceNumber: string;
  storeId: string;
  date: Date | string;
  customerId?: string;
  customerName: string;
  items: any[];
  subtotal: number;
  totalItemDiscount: number;
  invoiceDiscount: number;
  tax: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
  status: string;
  seller: string;
  originalInvoiceId?: string;
  isReturn?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  synced?: boolean; // Local flag to track sync status
  syncError?: string; // Store sync errors
}

interface SyncQueueItem {
  id: string;
  sale: SaleRecord;
  action: 'create' | 'update' | 'delete';
  timestamp: number;
  retryCount: number;
}

class SalesDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
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
      const request = openIndexedDB(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create sales store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const salesStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: false,
          });
          salesStore.createIndex('storeId', 'storeId', { unique: false });
          salesStore.createIndex('invoiceNumber', 'invoiceNumber', { unique: false });
          salesStore.createIndex('date', 'date', { unique: false });
          salesStore.createIndex('storeId_invoiceNumber', ['storeId', 'invoiceNumber'], {
            unique: true,
          });
          salesStore.createIndex('synced', 'synced', { unique: false });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(SYNC_STORE_NAME)) {
          const syncStore = db.createObjectStore(SYNC_STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  /**
   * Add or update a sale in IndexedDB
   */
  async saveSale(sale: SaleRecord): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const uniqueIndex = store.index('storeId_invoiceNumber');

    // Normalize sale data
    const saleData: SaleRecord = {
      ...sale,
      id: sale.id || sale._id || `temp_${Date.now()}_${Math.random()}`,
      date: typeof sale.date === 'string' ? sale.date : sale.date.toISOString(),
      createdAt:
        sale.createdAt instanceof Date
          ? sale.createdAt.toISOString()
          : sale.createdAt || new Date().toISOString(),
      updatedAt:
        sale.updatedAt instanceof Date
          ? sale.updatedAt.toISOString()
          : sale.updatedAt || new Date().toISOString(),
      synced: sale.synced ?? false,
    };

    // Ensure storeId is set and normalized
    if (!saleData.storeId) {
      throw new Error('storeId is required to save sale');
    }
    saleData.storeId = saleData.storeId.toLowerCase().trim();

    return new Promise((resolve, reject) => {
      // Check if a sale with the same storeId and invoiceNumber already exists
      const checkRequest = uniqueIndex.get([saleData.storeId, saleData.invoiceNumber]);
      
      checkRequest.onsuccess = () => {
        const existingSale = checkRequest.result;
        
        if (existingSale) {
          // Update existing sale, preserving its ID and merging data
          const updatedSale: SaleRecord = {
            ...existingSale, // Preserve existing data
            ...saleData, // Override with new data
            id: existingSale.id, // Always keep the existing ID to avoid duplicates
            _id: saleData._id || saleData.id || existingSale._id || existingSale.id, // Update _id if provided
          };
          
          const putRequest = store.put(updatedSale);
          putRequest.onsuccess = () => {
            console.log('✅ Sale updated in IndexedDB:', saleData.invoiceNumber);
            resolve();
          };
          putRequest.onerror = () => {
            console.error('❌ Failed to update sale in IndexedDB:', putRequest.error);
            reject(putRequest.error);
          };
        } else {
          // New sale - use put instead of add to handle any edge cases
          // Put will insert if the ID doesn't exist, or update if it does
          const putRequest = store.put(saleData);
          putRequest.onsuccess = () => {
            console.log('✅ Sale saved to IndexedDB:', saleData.invoiceNumber);
            resolve();
          };
          putRequest.onerror = () => {
            // If put fails due to unique constraint, try to find and update existing sale
            if (putRequest.error?.name === 'ConstraintError' || putRequest.error?.name === 'DataError') {
              console.warn('⚠️ Constraint error on put, checking for existing sale...');
              
              // Try to find existing sale by storeId and invoiceNumber again
              const retryCheckRequest = uniqueIndex.get([saleData.storeId, saleData.invoiceNumber]);
              retryCheckRequest.onsuccess = () => {
                const retryExistingSale = retryCheckRequest.result;
                if (retryExistingSale) {
                  // Found existing sale, update it
                  const mergedSale: SaleRecord = {
                    ...retryExistingSale,
                    ...saleData,
                    id: retryExistingSale.id, // Keep existing ID
                    _id: saleData._id || saleData.id || retryExistingSale._id || retryExistingSale.id,
                  };
                  
                  const retryPutRequest = store.put(mergedSale);
                  retryPutRequest.onsuccess = () => {
                    console.log('✅ Sale updated in IndexedDB (retry):', saleData.invoiceNumber);
                    resolve();
                  };
                  retryPutRequest.onerror = () => {
                    console.error('❌ Failed to update sale in IndexedDB (retry):', retryPutRequest.error);
                    reject(retryPutRequest.error);
                  };
                } else {
                  // Still not found, this is unexpected
                  console.error('❌ Sale not found but constraint error occurred:', saleData.invoiceNumber);
                  reject(new Error('Failed to save sale: unique constraint violation'));
                }
              };
              retryCheckRequest.onerror = () => {
                console.error('❌ Failed to check for existing sale:', retryCheckRequest.error);
                reject(retryCheckRequest.error);
              };
            } else {
              console.error('❌ Failed to save sale to IndexedDB:', putRequest.error);
              reject(putRequest.error);
            }
          };
        }
      };
      
      checkRequest.onerror = () => {
        // If index check fails, try direct put (will handle insert or update)
        console.warn('⚠️ Index check failed, trying direct put...');
        const putRequest = store.put(saleData);
        putRequest.onsuccess = () => {
          console.log('✅ Sale saved to IndexedDB (direct put):', saleData.invoiceNumber);
          resolve();
        };
        putRequest.onerror = () => {
          // If direct put also fails, try to find existing sale by scanning
          if (putRequest.error?.name === 'ConstraintError' || putRequest.error?.name === 'DataError') {
            console.warn('⚠️ Direct put failed with constraint error, scanning for existing sale...');
            
            // Fallback: scan all sales to find matching storeId + invoiceNumber
            const scanRequest = store.openCursor();
            let foundExisting = false;
            
            scanRequest.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor) {
                const sale = cursor.value as SaleRecord;
                if (sale.storeId === saleData.storeId && sale.invoiceNumber === saleData.invoiceNumber) {
                  foundExisting = true;
                  // Found existing sale, update it
                  const mergedSale: SaleRecord = {
                    ...sale,
                    ...saleData,
                    id: sale.id, // Keep existing ID
                    _id: saleData._id || saleData.id || sale._id || sale.id,
                  };
                  
                  const updateRequest = store.put(mergedSale);
                  updateRequest.onsuccess = () => {
                    console.log('✅ Sale updated in IndexedDB (scan fallback):', saleData.invoiceNumber);
                    resolve();
                  };
                  updateRequest.onerror = () => {
                    console.error('❌ Failed to update sale (scan fallback):', updateRequest.error);
                    reject(updateRequest.error);
                  };
                } else {
                  cursor.continue();
                }
              } else {
                // No matching sale found after scanning
                if (!foundExisting) {
                  console.error('❌ Sale not found but constraint error occurred:', saleData.invoiceNumber);
                  reject(new Error('Failed to save sale: unique constraint violation without existing record'));
                }
              }
            };
            
            scanRequest.onerror = () => {
              console.error('❌ Failed to scan sales:', scanRequest.error);
              reject(scanRequest.error);
            };
          } else {
            console.error('❌ Failed to save sale to IndexedDB:', putRequest.error);
            reject(putRequest.error);
          }
        };
      };
    });
  }

  /**
   * Get a sale by ID
   */
  async getSale(id: string): Promise<SaleRecord | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get sales by store ID with optional filters
   */
  async getSalesByStore(
    storeId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      customerId?: string;
      status?: string;
      paymentMethod?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<SaleRecord[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('storeId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(storeId.toLowerCase().trim());
      request.onsuccess = () => {
        let sales: SaleRecord[] = request.result || [];
        
        console.log('[SalesDB] Total sales in IndexedDB for store:', sales.length);
        if (sales.length > 0 && sales.length <= 5) {
          console.log('[SalesDB] Sample sales before filtering:', sales.slice(0, 3).map(s => ({
            invoiceNumber: s.invoiceNumber,
            date: s.date,
            dateType: typeof s.date,
            dateObj: new Date(s.date).toISOString(),
            dateOnly: new Date(s.date).toISOString().split('T')[0]
          })));
        }

        // Apply filters
        if (filters) {
          if (filters.startDate || filters.endDate) {
            console.log('[SalesDB] Filtering sales by date:', {
              startDate: filters.startDate?.toISOString(),
              endDate: filters.endDate?.toISOString(),
              totalSalesBeforeFilter: sales.length
            });
            
            // Use simple calendar date filtering for better reliability
            // Business date filtering can be complex and may exclude valid sales
            const beforeFilterCount = sales.length;
            
            // Convert filter dates to YYYY-MM-DD strings for simple comparison
            const filterStartStr = filters.startDate ? new Date(filters.startDate).toISOString().split('T')[0] : null;
            const filterEndStr = filters.endDate ? new Date(filters.endDate).toISOString().split('T')[0] : null;
            
            console.log('[SalesDB] Date filter strings:', {
              filterStartStr,
              filterEndStr
            });
            
            sales = sales.filter((sale) => {
              if (!sale.date) {
                console.warn('[SalesDB] Sale missing date:', sale.invoiceNumber);
                return false;
              }
              
              // Convert sale date to YYYY-MM-DD string for simple comparison
              const saleDate = new Date(sale.date);
              const saleDateStr = saleDate.toISOString().split('T')[0];
              
              // Simple string comparison (YYYY-MM-DD format is naturally sortable)
              const matchesStart = !filterStartStr || saleDateStr >= filterStartStr;
              const matchesEnd = !filterEndStr || saleDateStr <= filterEndStr;
              
              return matchesStart && matchesEnd;
            });
            
            console.log('[SalesDB] After calendar date filtering:', {
              before: beforeFilterCount,
              after: sales.length,
              filtered: beforeFilterCount - sales.length
            });
            
            // Log sample filtered sales for debugging
            if (sales.length > 0 && sales.length <= 5) {
              console.log('[SalesDB] Sample filtered sales:', sales.map(s => ({
                invoiceNumber: s.invoiceNumber,
                date: s.date,
                dateObj: new Date(s.date).toISOString()
              })));
            }
          }

          if (filters.customerId) {
            sales = sales.filter((sale) => sale.customerId === filters.customerId);
          }

          if (filters.status) {
            sales = sales.filter((sale) => sale.status === filters.status);
          }

          if (filters.paymentMethod) {
            sales = sales.filter(
              (sale) => sale.paymentMethod?.toLowerCase() === filters.paymentMethod?.toLowerCase()
            );
          }

          // Sort by date descending
          sales.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
          });

          // Apply pagination
          if (filters.offset !== undefined) {
            sales = sales.slice(filters.offset);
          }
          if (filters.limit !== undefined) {
            sales = sales.slice(0, filters.limit);
          }
        } else {
          // Default sort by date descending
          sales.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
          });
        }

        resolve(sales);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get all unsynced sales
   */
  async getUnsyncedSales(storeId?: string): Promise<SaleRecord[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const sales: SaleRecord[] = [];
      
      // Iterate through all sales and filter by synced status
      // We can't use IDBKeyRange.only(false) because boolean values don't work well with key ranges
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const sale = cursor.value as SaleRecord;
          
          // Check if sale is unsynced (synced === false or undefined)
          const isUnsynced = sale.synced === false || sale.synced === undefined;
          
          if (isUnsynced) {
            // Filter by storeId if provided
            if (!storeId || (sale.storeId && sale.storeId.toLowerCase().trim() === storeId.toLowerCase().trim())) {
              sales.push(sale);
            }
          }
          
          cursor.continue();
        } else {
          // No more records
          resolve(sales);
        }
      };
      
      request.onerror = () => {
        console.error('❌ Error getting unsynced sales:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Mark a sale as synced
   * Can find sale by ID or by storeId + invoiceNumber combination
   */
  async markAsSynced(saleId: string, backendId?: string, storeId?: string, invoiceNumber?: string, updatedInvoiceNumber?: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const uniqueIndex = store.index('storeId_invoiceNumber');

    return new Promise((resolve, reject) => {
      function updateSaleWithSale(saleToUpdate: SaleRecord) {
        saleToUpdate.synced = true;
        saleToUpdate.syncError = undefined;
        // If backend assigned a different invoice number (e.g., after resolving conflict), persist it locally
        if (updatedInvoiceNumber) {
          saleToUpdate.invoiceNumber = updatedInvoiceNumber;
        }
        
        // Store backend ID in _id field, but keep the original id as primary key
        // This prevents creating duplicate records when the ID changes, which would violate
        // the unique constraint on storeId_invoiceNumber
        if (backendId) {
          saleToUpdate._id = backendId;
          // Keep the original ID as primary key to avoid unique constraint violations
          // The _id field stores the backend MongoDB ID for reference
        }

        const putRequest = store.put(saleToUpdate);
        putRequest.onsuccess = () => {
          console.log('✅ Sale marked as synced:', saleToUpdate.invoiceNumber);
          resolve();
        };
        putRequest.onerror = () => {
          console.error('❌ Failed to mark sale as synced:', putRequest.error);
          reject(putRequest.error);
        };
      }
      
      function findSaleByStoreAndInvoice() {
        if (!storeId || !invoiceNumber) {
          reject(new Error(`Sale not found with ID: ${saleId}`));
          return;
        }
        
        const indexRequest = uniqueIndex.get([storeId.toLowerCase().trim(), invoiceNumber]);
        
        indexRequest.onsuccess = () => {
          const sale = indexRequest.result;
          if (!sale) {
            reject(new Error(`Sale not found with storeId: ${storeId}, invoiceNumber: ${invoiceNumber}`));
            return;
          }
          updateSaleWithSale(sale);
        };
        
        indexRequest.onerror = () => {
          reject(new Error(`Sale not found with storeId: ${storeId}, invoiceNumber: ${invoiceNumber}`));
        };
      }
      
      // Try to find sale by ID first
      const getRequest = store.get(saleId);
      getRequest.onsuccess = () => {
        const sale = getRequest.result;
        
        if (sale) {
          // Found by ID, update it
          updateSaleWithSale(sale);
        } else if (storeId && invoiceNumber) {
          // Not found by ID, try finding by storeId + invoiceNumber
          findSaleByStoreAndInvoice();
        } else {
          reject(new Error(`Sale not found with ID: ${saleId}`));
        }
      };
      
      getRequest.onerror = () => {
        // If get by ID fails and we have storeId + invoiceNumber, try that
        if (storeId && invoiceNumber) {
          findSaleByStoreAndInvoice();
        } else {
          reject(new Error(`Sale not found with ID: ${saleId}`));
        }
      };
    });
  }

  /**
   * Mark a sale sync as failed
   * Can find sale by ID or by storeId + invoiceNumber combination
   */
  async markSyncError(saleId: string, error: string, storeId?: string, invoiceNumber?: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      function updateSaleWithSale(saleToUpdate: SaleRecord) {
        saleToUpdate.synced = false;
        saleToUpdate.syncError = error;

        const putRequest = store.put(saleToUpdate);
        putRequest.onsuccess = () => {
          console.warn('⚠️ Sale sync error recorded:', saleToUpdate.invoiceNumber, error);
          resolve();
        };
        putRequest.onerror = () => {
          reject(putRequest.error);
        };
      }
      
      function findSaleByStoreAndInvoice() {
        if (!storeId || !invoiceNumber) {
          reject(new Error(`Sale not found with ID: ${saleId}`));
          return;
        }
        
        const uniqueIndex = store.index('storeId_invoiceNumber');
        const indexRequest = uniqueIndex.get([storeId.toLowerCase().trim(), invoiceNumber]);
        
        indexRequest.onsuccess = () => {
          const sale = indexRequest.result;
          if (!sale) {
            reject(new Error(`Sale not found with storeId: ${storeId}, invoiceNumber: ${invoiceNumber}`));
            return;
          }
          updateSaleWithSale(sale);
        };
        
        indexRequest.onerror = () => {
          reject(new Error(`Sale not found with storeId: ${storeId}, invoiceNumber: ${invoiceNumber}`));
        };
      }
      
      // Try to find sale by ID first
      const getRequest = store.get(saleId);
      getRequest.onsuccess = () => {
        const sale = getRequest.result;
        
        if (sale) {
          // Found by ID, update it
          updateSaleWithSale(sale);
        } else if (storeId && invoiceNumber) {
          // Not found by ID, try finding by storeId + invoiceNumber
          findSaleByStoreAndInvoice();
        } else {
          reject(new Error(`Sale not found with ID: ${saleId}`));
        }
      };
      
      getRequest.onerror = () => {
        // If get by ID fails and we have storeId + invoiceNumber, try that
        if (storeId && invoiceNumber) {
          findSaleByStoreAndInvoice();
        } else {
          reject(new Error(`Sale not found with ID: ${saleId}`));
        }
      };
    });
  }

  /**
   * Add sale to sync queue
   */
  async addToSyncQueue(sale: SaleRecord, action: 'create' | 'update' | 'delete' = 'create'): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([SYNC_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(SYNC_STORE_NAME);

    const queueItem: SyncQueueItem = {
      id: sale.id || `sync_${Date.now()}_${Math.random()}`,
      sale,
      action,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const request = store.add(queueItem);
      request.onsuccess = () => {
        console.log('✅ Sale added to sync queue:', sale.invoiceNumber);
        resolve();
      };
      request.onerror = () => {
        console.error('❌ Failed to add to sync queue:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get sync queue items
   */
  async getSyncQueue(limit?: number): Promise<SyncQueueItem[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([SYNC_STORE_NAME], 'readonly');
    const store = transaction.objectStore(SYNC_STORE_NAME);
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => {
        let items: SyncQueueItem[] = request.result || [];
        items.sort((a, b) => a.timestamp - b.timestamp); // Oldest first

        if (limit) {
          items = items.slice(0, limit);
        }

        resolve(items);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Remove item from sync queue
   */
  async removeFromSyncQueue(queueItemId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([SYNC_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(SYNC_STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(queueItemId);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Clear all sales for a store (use with caution)
   */
  async clearStoreSales(storeId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('storeId');

    return new Promise((resolve, reject) => {
      const request = index.openKeyCursor(storeId.toLowerCase().trim());
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get sale count by store
   */
  async getSaleCount(storeId: string): Promise<number> {
    const sales = await this.getSalesByStore(storeId);
    return sales.length;
  }

  /**
   * Get the next invoice number for a store when offline
   * Checks IndexedDB for existing invoice numbers and generates the next unique one
   */
  async getNextInvoiceNumberOffline(storeId: string): Promise<string> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('storeId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(storeId.toLowerCase().trim());
      request.onsuccess = () => {
        const sales: SaleRecord[] = request.result || [];
        
        // Extract invoice numbers and find the highest number
        let maxNumber = 0;
        const invoiceNumberPattern = /^INV-(\d+)$/i;
        
        sales.forEach(sale => {
          if (sale.invoiceNumber) {
            const match = sale.invoiceNumber.match(invoiceNumberPattern);
            if (match) {
              const number = parseInt(match[1], 10);
              if (!isNaN(number) && number > maxNumber) {
                maxNumber = number;
              }
            }
          }
        });
        
        // Generate next invoice number
        const nextNumber = maxNumber + 1;
        const nextInvoiceNumber = `INV-${nextNumber}`;
        
        console.log(`[SalesDB] Generated offline invoice number: ${nextInvoiceNumber} (max found: ${maxNumber})`);
        resolve(nextInvoiceNumber);
      };
      
      request.onerror = () => {
        console.error('❌ Error getting next invoice number from IndexedDB:', request.error);
        // Fallback to INV-1 if we can't read from IndexedDB
        reject(new Error('Failed to get next invoice number'));
      };
    });
  }

  /**
   * Check if an invoice number already exists for a store
   */
  async invoiceNumberExists(storeId: string, invoiceNumber: string): Promise<boolean> {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const uniqueIndex = store.index('storeId_invoiceNumber');

    return new Promise((resolve, reject) => {
      const request = uniqueIndex.get([storeId.toLowerCase().trim(), invoiceNumber]);
      request.onsuccess = () => {
        resolve(!!request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
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
export const salesDB = new SalesDB();

// Export types
export type { SaleRecord, SyncQueueItem };

