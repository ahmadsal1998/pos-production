import { SaleTransaction } from '@/shared/types';

const SALES_STORAGE_KEY = 'pos-sales-transactions';

/**
 * Get all sales transactions from localStorage
 */
export const getStoredSales = (): SaleTransaction[] => {
  try {
    const stored = localStorage.getItem(SALES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
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
    // Check if sale with same ID already exists (avoid duplicates)
    const existingIndex = existingSales.findIndex(s => s.id === sale.id);
    if (existingIndex >= 0) {
      // Update existing sale
      existingSales[existingIndex] = sale;
    } else {
      // Add new sale at the beginning (most recent first)
      existingSales.unshift(sale);
    }
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(existingSales));
    
    // Dispatch custom event to notify other components in the same tab
    window.dispatchEvent(new Event('salesUpdated'));
  } catch (error) {
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
