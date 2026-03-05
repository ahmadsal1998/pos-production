import { SaleTransaction } from '@/shared/types';

const SALES_STORAGE_KEY = 'pos-sales-transactions';
/** Cap stored sales to avoid hitting ~10 MB localStorage limit */
const MAX_STORED_SALES = 100;

/**
 * Get all sales transactions from localStorage
 */
export const getStoredSales = (): SaleTransaction[] => {
  try {
    const stored = localStorage.getItem(SALES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.slice(0, MAX_STORED_SALES) : [];
    }
  } catch (error) {
    console.error('Error reading sales from localStorage:', error);
  }
  return [];
};

/**
 * Save a new sale transaction to localStorage
 */
export const saveSale = (sale: SaleTransaction): void => {
  try {
    const existingSales = getStoredSales();
    const existingIndex = existingSales.findIndex(s => s.id === sale.id);
    let toSave: SaleTransaction[];
    if (existingIndex >= 0) {
      toSave = [...existingSales];
      toSave[existingIndex] = sale;
    } else {
      toSave = [sale, ...existingSales];
    }
    const capped = toSave.slice(0, MAX_STORED_SALES);
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(capped));
    window.dispatchEvent(new Event('salesUpdated'));
  } catch (error: any) {
    if (error?.name === 'QuotaExceededError') {
      try {
        const existingSales = getStoredSales().slice(0, 30);
        localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(existingSales));
      } catch {}
    }
    console.error('Error saving sale to localStorage:', error);
  }
};

/**
 * Get all sales transactions, merging with provided initial data
 */
export const getAllSales = (initialSales: SaleTransaction[] = []): SaleTransaction[] => {
  const storedSales = getStoredSales();
  
  // Merge stored sales with initial sales, avoiding duplicates
  const salesMap = new Map<string, SaleTransaction>();
  
  // Add initial sales first
  initialSales.forEach(sale => {
    salesMap.set(sale.id, sale);
  });
  
  // Add stored sales (will overwrite initial sales if same ID)
  storedSales.forEach(sale => {
    salesMap.set(sale.id, sale);
  });
  
  // Sort by date (most recent first)
  return Array.from(salesMap.values()).sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
};
