// Product synchronization utility for POS
// Manages local product cache and synchronizes with server after quantity changes
// Uses IndexedDB for efficient storage and fast search

import { productsApi, ApiError } from '@/lib/api/client';
import { getCachedProducts, setCachedProducts, invalidateProductsCache, getStoreIdFromToken } from '@/lib/cache/productsCache';
import { productsDB } from '@/lib/db/productsDB';

export interface ProductSyncOptions {
  /**
   * Force refresh from server even if cache is valid
   */
  forceRefresh?: boolean;
  
  /**
   * Query server directly for critical operations (bypasses cache)
   */
  useServerQuery?: boolean;
  
  /**
   * Product IDs to sync (if provided, only syncs these products)
   */
  productIds?: string[];
  
  /**
   * Callback when sync completes
   */
  onSyncComplete?: (syncedCount: number) => void;
}

export interface ProductSyncResult {
  success: boolean;
  syncedCount: number;
  error?: string;
  products?: any[];
}

/**
 * Product synchronization manager
 * Handles local cache management and server synchronization
 */
class ProductSyncManager {
  private syncInProgress: Set<string> = new Set();
  private lastSyncTime: number = 0;
  private readonly SYNC_COOLDOWN = 1000; // 1 second cooldown between syncs

  /**
   * Sync products from server and update local cache
   */
  async syncProducts(options: ProductSyncOptions = {}): Promise<ProductSyncResult> {
    const { forceRefresh = false, productIds, onSyncComplete } = options;
    const storeId = getStoreIdFromToken();
    
    if (!storeId) {
      return {
        success: false,
        syncedCount: 0,
        error: 'Store ID not found',
      };
    }

    // If specific product IDs are provided, sync only those
    if (productIds && productIds.length > 0) {
      return this.syncSpecificProducts(productIds, onSyncComplete);
    }

    // Check if sync is in progress
    if (this.syncInProgress.has(storeId)) {
      console.log('[ProductSync] Sync already in progress, skipping...');
      return {
        success: false,
        syncedCount: 0,
        error: 'Sync already in progress',
      };
    }

    // Check cooldown
    const now = Date.now();
    if (!forceRefresh && now - this.lastSyncTime < this.SYNC_COOLDOWN) {
      console.log('[ProductSync] Sync cooldown active, skipping...');
      return {
        success: false,
        syncedCount: 0,
        error: 'Sync cooldown active',
      };
    }

    // Check IndexedDB first (unless force refresh)
    if (!forceRefresh) {
      try {
        const dbProducts = await productsDB.getAllProducts();
        if (dbProducts && dbProducts.length > 0) {
          // IndexedDB has products, return them
          return {
            success: true,
            syncedCount: dbProducts.length,
            products: dbProducts,
          };
        }
      } catch (error) {
        console.warn('[ProductSync] Error reading from IndexedDB, will fetch from server:', error);
      }
    }

    this.syncInProgress.add(storeId);
    this.lastSyncTime = now;

    try {
      // Fetch all products from server
      let allProducts: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      const pageSize = 1000;

      while (hasMorePages) {
        try {
          const response = await productsApi.getProducts({ 
            page: currentPage, 
            limit: pageSize 
          });

          if (response.success) {
            const productsData = (response.data as any)?.products || 
                                (response.data as any)?.data?.products || [];
            allProducts = [...allProducts, ...productsData];

            const pagination = (response.data as any)?.pagination;
            if (pagination) {
              hasMorePages = pagination.hasNextPage === true;
              currentPage++;
            } else {
              hasMorePages = false;
            }
          } else {
            hasMorePages = false;
          }
        } catch (pageError: any) {
          console.error(`[ProductSync] Error fetching page ${currentPage}:`, pageError);
          if (pageError.status === 401 || pageError.status === 403 || currentPage === 1) {
            hasMorePages = false;
          } else {
            hasMorePages = false; // Stop on error but keep what we have
          }
        }
      }

      if (allProducts.length > 0) {
        // Store in IndexedDB (primary storage)
        try {
          await productsDB.storeProducts(allProducts);
          // Notify other tabs
          (productsDB as any).notifyOtherTabs();
        } catch (dbError) {
          console.error('[ProductSync] Error storing products in IndexedDB:', dbError);
        }

        // Also update localStorage cache for backward compatibility
        try {
          const categories: Record<string, any> = {};
          allProducts.forEach((p: any) => {
            if (p.categoryId && p.category) {
              categories[p.categoryId] = p.category;
            }
          });
          setCachedProducts(storeId, allProducts, categories);
        } catch (cacheError) {
          console.warn('[ProductSync] Error updating localStorage cache:', cacheError);
        }

        const result: ProductSyncResult = {
          success: true,
          syncedCount: allProducts.length,
          products: allProducts,
        };

        if (onSyncComplete) {
          onSyncComplete(allProducts.length);
        }

        return result;
      } else {
        return {
          success: false,
          syncedCount: 0,
          error: 'No products found',
        };
      }
    } catch (error: any) {
      const apiError = error as ApiError;
      console.error('[ProductSync] Error syncing products:', apiError);
      return {
        success: false,
        syncedCount: 0,
        error: apiError.message || 'Failed to sync products',
      };
    } finally {
      this.syncInProgress.delete(storeId);
    }
  }

  /**
   * Sync specific products by ID (for targeted updates after stock changes)
   */
  private async syncSpecificProducts(
    productIds: string[],
    onSyncComplete?: (count: number) => void
  ): Promise<ProductSyncResult> {
    const storeId = getStoreIdFromToken();
    if (!storeId) {
      return {
        success: false,
        syncedCount: 0,
        error: 'Store ID not found',
      };
    }

    try {
      // Fetch each product individually
      const syncPromises = productIds.map(async (productId) => {
        try {
          const response = await productsApi.getProduct(productId);
          const product = (response.data as any)?.data?.product || 
                        (response.data as any)?.product;
          return product;
        } catch (error) {
          console.error(`[ProductSync] Error fetching product ${productId}:`, error);
          return null;
        }
      });

      const updatedProducts = (await Promise.all(syncPromises))
        .filter((p): p is any => p !== null);

      if (updatedProducts.length > 0) {
        // Update IndexedDB with new product data
        try {
          // Store each updated product
          await Promise.all(
            updatedProducts.map((product: any) => productsDB.storeProduct(product))
          );
          // Notify other tabs
          (productsDB as any).notifyOtherTabs();
        } catch (dbError) {
          console.error('[ProductSync] Error updating IndexedDB:', dbError);
        }

        // Also update localStorage cache for backward compatibility
        try {
          const cached = getCachedProducts(storeId);
          if (cached) {
            const productMap = new Map(
              cached.products.map((p: any) => [String(p.id || p._id), p])
            );

            updatedProducts.forEach((product: any) => {
              const productId = String(product.id || product._id);
              productMap.set(productId, product);
            });

            const mergedProducts = Array.from(productMap.values());
            const categories: Record<string, any> = { ...cached.categories };
            
            updatedProducts.forEach((p: any) => {
              if (p.categoryId && p.category) {
                categories[p.categoryId] = p.category;
              }
            });

            setCachedProducts(storeId, mergedProducts, categories);
          }
        } catch (cacheError) {
          console.warn('[ProductSync] Error updating localStorage cache:', cacheError);
        }

        // Get all products from IndexedDB to return
        const allProducts = await productsDB.getAllProducts();

        if (onSyncComplete) {
          onSyncComplete(updatedProducts.length);
        }

        return {
          success: true,
          syncedCount: updatedProducts.length,
          products: allProducts,
        };
      }

      return {
        success: false,
        syncedCount: 0,
        error: 'No products updated',
      };
    } catch (error: any) {
      const apiError = error as ApiError;
      console.error('[ProductSync] Error syncing specific products:', apiError);
      return {
        success: false,
        syncedCount: 0,
        error: apiError.message || 'Failed to sync products',
      };
    }
  }

  /**
   * Query server directly for a product (bypasses cache)
   * Use this for critical operations where you need the latest stock
   */
  async queryProductFromServer(productId: string): Promise<any | null> {
    try {
      const response = await productsApi.getProduct(productId);
      const product = (response.data as any)?.data?.product || 
                     (response.data as any)?.product;
      return product || null;
    } catch (error: any) {
      const apiError = error as ApiError;
      console.error(`[ProductSync] Error querying product ${productId} from server:`, apiError);
      return null;
    }
  }

  /**
   * Query multiple products from server (bypasses cache)
   */
  async queryProductsFromServer(productIds: string[]): Promise<any[]> {
    const promises = productIds.map(id => this.queryProductFromServer(id));
    const results = await Promise.all(promises);
    return results.filter((p): p is any => p !== null);
  }

  /**
   * Sync products after quantity changes (sales, returns, adjustments)
   * This ensures local cache is updated immediately after stock changes
   */
  async syncAfterQuantityChange(productIds: string[]): Promise<ProductSyncResult> {
    if (!productIds || productIds.length === 0) {
      return {
        success: false,
        syncedCount: 0,
        error: 'No product IDs provided',
      };
    }

    console.log(`[ProductSync] Syncing ${productIds.length} product(s) after quantity change...`);

    // Sync specific products
    try {
      const result = await this.syncSpecificProducts(productIds);
      if (result.success) {
        console.log(`[ProductSync] Successfully synced ${result.syncedCount} product(s)`);
      } else {
        console.warn(`[ProductSync] Failed to sync products: ${result.error}`);
      }
      return result;
    } catch (error: any) {
      console.error('[ProductSync] Error in sync after quantity change:', error);
      return {
        success: false,
        syncedCount: 0,
        error: error?.message || 'Failed to sync products',
      };
    }
  }

  /**
   * Invalidate cache and force refresh
   */
  invalidateCache(): void {
    const storeId = getStoreIdFromToken();
    if (storeId) {
      invalidateProductsCache(storeId);
      console.log('[ProductSync] Cache invalidated');
    }
  }

  /**
   * Sync a single product after create/update
   */
  async syncAfterCreateOrUpdate(productData: any): Promise<ProductSyncResult> {
    const storeId = getStoreIdFromToken();
    if (!storeId) {
      return {
        success: false,
        syncedCount: 0,
        error: 'Store ID not found',
      };
    }

    try {
      // Store the product directly in IndexedDB (we already have it from the response)
      try {
        await productsDB.storeProduct(productData);
        // Notify other tabs
        (productsDB as any).notifyOtherTabs();
        console.log(`[ProductSync] Successfully synced product ${productData.id || productData._id}`);
      } catch (dbError) {
        console.error('[ProductSync] Error storing product in IndexedDB:', dbError);
        // Fallback: fetch from server and sync
        const productId = productData.id || productData._id;
        if (productId) {
          return this.syncSpecificProducts([String(productId)]);
        }
      }

      return {
        success: true,
        syncedCount: 1,
        products: [productData],
      };
    } catch (error: any) {
      const apiError = error as ApiError;
      console.error('[ProductSync] Error syncing product:', apiError);
      return {
        success: false,
        syncedCount: 0,
        error: apiError.message || 'Failed to sync product',
      };
    }
  }

  /**
   * Delete a product from IndexedDB (used when product is deleted on server)
   */
  async syncAfterDelete(productId: string | number): Promise<ProductSyncResult> {
    const storeId = getStoreIdFromToken();
    if (!storeId) {
      return {
        success: false,
        syncedCount: 0,
        error: 'Store ID not found',
      };
    }

    try {
      // Delete from IndexedDB
      await productsDB.deleteProduct(productId);
      // Notify other tabs
      (productsDB as any).notifyOtherTabs();
      console.log(`[ProductSync] Deleted product ${productId} from IndexedDB`);

      // Also update localStorage cache for backward compatibility
      try {
        const cached = getCachedProducts(storeId);
        if (cached) {
          const filteredProducts = cached.products.filter(
            (p: any) => String(p.id || p._id) !== String(productId)
          );
          setCachedProducts(storeId, filteredProducts, cached.categories);
        }
      } catch (cacheError) {
        console.warn('[ProductSync] Error updating localStorage cache:', cacheError);
      }

      return {
        success: true,
        syncedCount: 1,
      };
    } catch (error) {
      console.error('[ProductSync] Error deleting product from IndexedDB:', error);
      return {
        success: false,
        syncedCount: 0,
        error: error instanceof Error ? error.message : 'Failed to delete product',
      };
    }
  }

  /**
   * Get cached products from IndexedDB (if available)
   */
  async getCachedProducts(): Promise<any[]> {
    try {
      return await productsDB.getAllProducts();
    } catch (error) {
      console.error('[ProductSync] Error getting products from IndexedDB:', error);
      // Fallback to localStorage
      const storeId = getStoreIdFromToken();
      if (storeId) {
        const cached = getCachedProducts(storeId);
        return cached ? cached.products : [];
      }
      return [];
    }
  }
}

// Export singleton instance
export const productSync = new ProductSyncManager();

