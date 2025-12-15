/**
 * Utility functions for safe IndexedDB access
 * Handles mobile browser compatibility issues where indexedDB might not be available
 */

/**
 * Safely get the IndexedDB API
 * Works on both desktop and mobile browsers
 */
export function getIndexedDB(): IDBFactory | null {
  // Try different ways to access IndexedDB for maximum compatibility
  if (typeof window !== 'undefined') {
    // Standard way
    if (window.indexedDB) {
      return window.indexedDB;
    }
    // Fallback for some mobile browsers
    if ((window as any).mozIndexedDB) {
      return (window as any).mozIndexedDB;
    }
    if ((window as any).webkitIndexedDB) {
      return (window as any).webkitIndexedDB;
    }
    if ((window as any).msIndexedDB) {
      return (window as any).msIndexedDB;
    }
  }
  
  // Try global scope (for some environments)
  if (typeof indexedDB !== 'undefined') {
    return indexedDB;
  }
  
  return null;
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return getIndexedDB() !== null;
}

/**
 * Safely open an IndexedDB database
 * Throws an error if IndexedDB is not available
 */
export function openIndexedDB(
  name: string,
  version: number
): IDBOpenDBRequest {
  const idb = getIndexedDB();
  if (!idb) {
    throw new Error(
      'IndexedDB is not available in this browser. Please use a modern browser that supports IndexedDB.'
    );
  }
  return idb.open(name, version);
}

