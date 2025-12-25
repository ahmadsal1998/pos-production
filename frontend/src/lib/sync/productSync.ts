// Product synchronization utility for POS
// Manages local product cache and synchronizes with server after quantity changes
// Uses IndexedDB for efficient storage and fast search

import { productsApi, ApiError, apiClient } from '@/lib/api/client';
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
  private readonly SYNC_COOLDOWN = 30 * 1000; // 30 seconds cooldown between syncs (increased to prevent rapid retries)
  private readonly DATA_FRESHNESS_THRESHOLD = 5 * 60 * 1000; // 5 minutes - consider data fresh if updated within this time
  private readonly MAX_PAGES = 100; // Maximum number of pages to fetch (safety limit)
  private readonly REQUEST_WAIT_TIMEOUT = 10 * 1000; // 10 seconds max wait for active requests

  /**
   * Wait for active requests to complete (with timeout)
   * @returns true if requests completed, false if timeout
   */
  private async waitForActiveRequests(): Promise<boolean> {
    const startTime = Date.now();
    while (apiClient.hasActiveRequests()) {
      if (Date.now() - startTime > this.REQUEST_WAIT_TIMEOUT) {
        console.warn(`[ProductSync] ⚠️ Timeout waiting for active requests (${this.REQUEST_WAIT_TIMEOUT / 1000}s)`);
        return false;
      }
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return true;
  }

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
      console.log('[ProductSync] ⚠️ Sync already in progress for storeId:', storeId, '- skipping duplicate request');
      return {
        success: false,
        syncedCount: 0,
        error: 'Sync already in progress',
      };
    }

    // Check for ongoing API requests before starting sync
    if (apiClient.hasActiveRequests()) {
      const activeCount = apiClient.getActiveRequestCount();
      const activeRequests = apiClient.getActiveRequests();
      console.log(`[ProductSync] ⚠️ ${activeCount} ongoing request(s) detected, waiting before sync:`, activeRequests);
      
      // Wait for active requests to complete (with timeout)
      const waited = await this.waitForActiveRequests();
      if (!waited) {
        return {
          success: false,
          syncedCount: 0,
          error: `Cannot start sync: ${activeCount} request(s) still in progress after timeout`,
        };
      }
      console.log(`[ProductSync] ✅ Active requests completed, proceeding with sync`);
    }

    // Check cooldown
    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    if (!forceRefresh && timeSinceLastSync < this.SYNC_COOLDOWN) {
      const remainingCooldown = Math.ceil((this.SYNC_COOLDOWN - timeSinceLastSync) / 1000);
      console.log(`[ProductSync] ⚠️ Sync cooldown active (${remainingCooldown}s remaining), skipping...`);
      return {
        success: false,
        syncedCount: 0,
        error: `Sync cooldown active (${remainingCooldown}s remaining)`,
      };
    }

    // Check IndexedDB first (unless force refresh)
    if (!forceRefresh) {
      try {
        const dbProducts = await productsDB.getAllProducts();
        if (dbProducts && dbProducts.length > 0) {
          // Check if data is fresh (updated recently)
          const isFresh = await productsDB.isDataFresh(this.DATA_FRESHNESS_THRESHOLD);
          if (isFresh) {
            console.log(`[ProductSync] IndexedDB has ${dbProducts.length} fresh products (updated within ${this.DATA_FRESHNESS_THRESHOLD / 1000 / 60} minutes), skipping server sync`);
            return {
              success: true,
              syncedCount: dbProducts.length,
              products: dbProducts,
            };
          } else {
            console.log(`[ProductSync] IndexedDB has ${dbProducts.length} products but data is stale, syncing from server...`);
          }
        }
      } catch (error) {
        console.warn('[ProductSync] Error reading from IndexedDB, will fetch from server:', error);
      }
    }

    this.syncInProgress.add(storeId);
    this.lastSyncTime = now;
    
    console.log(`[ProductSync] 🚀 Starting sync for storeId: ${storeId} (forceRefresh: ${forceRefresh})`);

    try {
      // Try to fetch all products in one request using all=true (more efficient, up to 10,000 products)
      // Falls back to pagination if needed for stores with more than 10,000 products
      let allProducts: any[] = [];
      const startTime = Date.now();
      let totalProductsFromServer: number | null = null;

      try {
        // First, try fetching all products at once (up to 10,000)
        console.log(`[ProductSync] Attempting to fetch all products at once (all=true)...`);
        const allResponse = await productsApi.getProducts({ 
          all: true,
          includeCategories: true 
        });

        if (allResponse.success) {
          const responseData = allResponse.data as any;
          const productsData = responseData?.products || [];
          const pagination = responseData?.pagination;
          
          if (pagination) {
            totalProductsFromServer = pagination.totalProducts;
            console.log(`[ProductSync] 📊 Server reports ${totalProductsFromServer} total products`);
          }
          
          allProducts = productsData;
          console.log(`[ProductSync] ✅ Successfully fetched all products in one request: ${allProducts.length} products`);
          
          // Verify we got all products
          if (totalProductsFromServer !== null && allProducts.length !== totalProductsFromServer) {
            console.warn(`[ProductSync] ⚠️ Mismatch: Expected ${totalProductsFromServer} products but got ${allProducts.length}. This may indicate a server-side issue.`);
            // If we got fewer products than expected, fall back to pagination to get the rest
            if (allProducts.length < totalProductsFromServer) {
              console.log(`[ProductSync] ⚠️ Only got ${allProducts.length} of ${totalProductsFromServer} products. Falling back to pagination to fetch remaining products...`);
              throw new Error(`Only fetched ${allProducts.length} of ${totalProductsFromServer} products, using pagination fallback`);
            }
          }
          
          // If we got products but no pagination info, and the count seems low, try pagination as fallback
          if (allProducts.length > 0 && totalProductsFromServer === null && allProducts.length < 100) {
            console.warn(`[ProductSync] ⚠️ Got ${allProducts.length} products without pagination info. This might be incomplete. Falling back to pagination...`);
            throw new Error('Products count seems incomplete, using pagination fallback');
          }
        } else {
          console.warn(`[ProductSync] ⚠️ All-products fetch returned success=false, falling back to pagination`);
          throw new Error('All-products fetch failed, using pagination fallback');
        }
      } catch (allError: any) {
        // Fallback to pagination if all=true fails or returns insufficient data
        console.log(`[ProductSync] Falling back to pagination-based fetching...`);
        console.log(`[ProductSync] Error reason: ${allError.message || 'Unknown error'}`);
        
        // If we already got some products from the all=true attempt, keep them
        const initialProductCount = allProducts.length;
        if (initialProductCount > 0) {
          console.log(`[ProductSync] Keeping ${initialProductCount} products from all=true attempt, fetching remaining via pagination...`);
          // Start from page 2 if we already have products (assuming page 1 was already fetched)
          // But actually, if all=true returned products, we should start from page 1 to ensure we get everything
          // So we'll start from page 1 but skip products we already have
        }
        
        let currentPage = 1;
        let hasMorePages = true;
        const pageSize = 100; // Backend max is 100 per page

        while (hasMorePages && currentPage <= this.MAX_PAGES) {
          try {
            // Verify token is still present before each request
            const token = localStorage.getItem('auth-token');
            if (!token) {
              console.error(`[ProductSync] ❌ No auth token found before fetching page ${currentPage}. Stopping pagination.`);
              hasMorePages = false;
              break;
            }

            console.log(`[ProductSync] Fetching page ${currentPage} (limit: ${pageSize})...`);
            const response = await productsApi.getProducts({ 
              page: currentPage, 
              limit: pageSize,
              includeCategories: true 
            });

            if (response.success) {
              const responseData = response.data as any;
              const productsData = responseData?.products || [];
              const pagination = responseData?.pagination;
              
              allProducts = [...allProducts, ...productsData];
              
              // Update total from server if available
              if (pagination && pagination.totalProducts) {
                totalProductsFromServer = pagination.totalProducts;
              }

              console.log(`[ProductSync] ✅ Page ${currentPage}: ${productsData.length} products (total so far: ${allProducts.length}${totalProductsFromServer ? ` / ${totalProductsFromServer} expected` : ''})`);

              if (pagination) {
                hasMorePages = pagination.hasNextPage === true;
                currentPage++;
                console.log(`[ProductSync] Has more pages: ${hasMorePages}, next page: ${currentPage}`);
                
                // Safety check: if we've fetched all products according to pagination, stop
                if (totalProductsFromServer !== null && allProducts.length >= totalProductsFromServer) {
                  console.log(`[ProductSync] ✅ Fetched all ${totalProductsFromServer} products, stopping pagination`);
                  hasMorePages = false;
                }
              } else {
                // If no pagination info but we got products, continue to next page
                // Only stop if we got 0 products (empty page)
                if (productsData.length === 0) {
                  console.log(`[ProductSync] No pagination info and empty page, assuming no more pages`);
                  hasMorePages = false;
                } else {
                  console.log(`[ProductSync] No pagination info but got ${productsData.length} products, continuing to next page...`);
                  currentPage++;
                }
              }
            } else {
              console.warn(`[ProductSync] ⚠️ Page ${currentPage} returned success=false, stopping pagination`);
              hasMorePages = false;
            }
            
            // Safety check: prevent infinite loops
            if (currentPage > this.MAX_PAGES) {
              console.warn(`[ProductSync] ⚠️ Reached maximum page limit (${this.MAX_PAGES}), stopping pagination`);
              hasMorePages = false;
              break;
            }
          } catch (pageError: any) {
          console.error(`[ProductSync] ❌ Error fetching page ${currentPage}:`, {
            status: pageError.status,
            message: pageError.message,
            hasToken: !!localStorage.getItem('auth-token'),
          });
          
          // For 401 errors, check if token is still valid
          if (pageError.status === 401) {
            const token = localStorage.getItem('auth-token');
            if (token) {
              try {
                // Check if token is expired
                const payload = JSON.parse(atob(token.split('.')[1]));
                const exp = payload.exp * 1000;
                const now = Date.now();
                if (exp < now) {
                  console.error(`[ProductSync] Token expired during pagination. Stopping at page ${currentPage}`);
                  hasMorePages = false;
                } else {
                  // Token is still valid but got 401 - might be temporary server issue
                  // Retry once for pagination requests
                  console.warn(`[ProductSync] ⚠️ Got 401 but token is valid. Retrying page ${currentPage} once...`);
                  try {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                    const retryResponse = await productsApi.getProducts({ 
                      page: currentPage, 
                      limit: pageSize,
                      includeCategories: true 
                    });
                    if (retryResponse.success) {
                      const retryResponseData = retryResponse.data as any;
                      const productsData = retryResponseData?.products || [];
                      allProducts = [...allProducts, ...productsData];
                      const pagination = retryResponseData?.pagination;
                      if (pagination) {
                        hasMorePages = pagination.hasNextPage === true;
                        currentPage++;
                        if (pagination.totalProducts) {
                          totalProductsFromServer = pagination.totalProducts;
                        }
                      } else {
                        hasMorePages = false;
                      }
                      console.log(`[ProductSync] ✅ Retry successful for page ${currentPage - 1}`);
                      continue;
                    }
                  } catch (retryError) {
                    console.error(`[ProductSync] ❌ Retry also failed for page ${currentPage}`);
                  }
                  hasMorePages = false;
                }
              } catch (e) {
                console.error(`[ProductSync] Error decoding token:`, e);
                hasMorePages = false;
              }
            } else {
              console.error(`[ProductSync] No token found after 401 error. Stopping pagination.`);
              hasMorePages = false;
            }
          } else if (pageError.status === 403 || currentPage === 1) {
            // 403 or error on first page - stop immediately
            hasMorePages = false;
          } else {
            // Other errors - stop but keep what we have
            console.warn(`[ProductSync] Stopping pagination due to error (keeping ${allProducts.length} products)`);
            hasMorePages = false;
          }
          }
          
          // Safety check: if we hit max pages, log a warning
          if (currentPage > this.MAX_PAGES) {
            console.warn(`[ProductSync] ⚠️ Stopped at maximum page limit (${this.MAX_PAGES}). There may be more products.`);
          }
        }
      }
      
      const syncDuration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // Final verification
      if (totalProductsFromServer !== null && allProducts.length !== totalProductsFromServer) {
        console.warn(`[ProductSync] ⚠️ FINAL MISMATCH: Server reports ${totalProductsFromServer} total products, but we fetched ${allProducts.length} products. Some products may be missing!`);
        console.warn(`[ProductSync] ⚠️ Missing: ${totalProductsFromServer - allProducts.length} products`);
      }
      
      console.log(`[ProductSync] ✅ Sync completed: ${allProducts.length} products fetched in ${syncDuration}s${totalProductsFromServer !== null ? ` (server total: ${totalProductsFromServer})` : ''}`);

      if (allProducts.length > 0) {
        // Store in IndexedDB (primary storage)
        // Use incremental updates by default (faster) - only clearAll for forced full refresh
        try {
          await productsDB.storeProducts(allProducts, { clearAll: forceRefresh });
          
          // Verify the count matches (safety check)
          const storedCount = await productsDB.getProductCount();
          if (storedCount !== allProducts.length) {
            console.warn(`[ProductSync] ⚠️ Count mismatch detected: Expected ${allProducts.length} products, but IndexedDB has ${storedCount}. Running deduplication...`);
            try {
              const dedupResult = await productsDB.deduplicateProducts();
              console.log(`[ProductSync] ✅ Deduplication complete: Removed ${dedupResult.removed} duplicates, kept ${dedupResult.kept} products`);
              
              // Verify again after deduplication
              const finalCount = await productsDB.getProductCount();
              if (finalCount !== allProducts.length) {
                console.warn(`[ProductSync] ⚠️ Count still mismatched after deduplication: Expected ${allProducts.length}, got ${finalCount}`);
              } else {
                console.log(`[ProductSync] ✅ Count verified: ${finalCount} products match server count`);
              }
            } catch (dedupError) {
              console.error('[ProductSync] Error during deduplication:', dedupError);
            }
          } else {
            console.log(`[ProductSync] ✅ Count verified: ${storedCount} products match server count`);
          }
          
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
      console.error('[ProductSync] ❌ Error syncing products:', {
        message: apiError.message,
        status: apiError.status,
        storeId,
      });
      return {
        success: false,
        syncedCount: 0,
        error: apiError.message || 'Failed to sync products',
      };
    } finally {
      // Always clear sync in progress flag, even on error
      this.syncInProgress.delete(storeId);
      console.log(`[ProductSync] 🏁 Sync finished for storeId: ${storeId}, syncInProgress cleared`);
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

    // Check for ongoing API requests before starting sync
    if (apiClient.hasActiveRequests()) {
      const activeCount = apiClient.getActiveRequestCount();
      const activeRequests = apiClient.getActiveRequests();
      console.log(`[ProductSync] ⚠️ ${activeCount} ongoing request(s) detected, waiting before sync:`, activeRequests);
      
      // Wait for active requests to complete (with timeout)
      const waited = await this.waitForActiveRequests();
      if (!waited) {
        return {
          success: false,
          syncedCount: 0,
          error: `Cannot start sync: ${activeCount} request(s) still in progress after timeout`,
        };
      }
      console.log(`[ProductSync] ✅ Active requests completed, proceeding with sync`);
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
    // Check for ongoing API requests before querying
    if (apiClient.hasActiveRequests()) {
      const activeCount = apiClient.getActiveRequestCount();
      console.log(`[ProductSync] ⚠️ ${activeCount} ongoing request(s) detected, waiting before querying product ${productId}`);
      // For single product queries, we can still proceed but log a warning
      // This is less critical than full syncs, but we still want to be aware
    }

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

    // Check for ongoing API requests before starting sync
    if (apiClient.hasActiveRequests()) {
      const activeCount = apiClient.getActiveRequestCount();
      const activeRequests = apiClient.getActiveRequests();
      console.log(`[ProductSync] ⚠️ ${activeCount} ongoing request(s) detected, waiting before sync after quantity change:`, activeRequests);
      
      // Wait for active requests to complete (with timeout)
      const waited = await this.waitForActiveRequests();
      if (!waited) {
        return {
          success: false,
          syncedCount: 0,
          error: `Cannot start sync: ${activeCount} request(s) still in progress after timeout`,
        };
      }
      console.log(`[ProductSync] ✅ Active requests completed, proceeding with sync after quantity change`);
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

