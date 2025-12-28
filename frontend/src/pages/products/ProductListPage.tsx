import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AR_LABELS, EditIcon, DeleteIcon, SearchIcon, GridViewIcon, TableViewIcon } from '@/shared/constants';
import { Product } from '@/shared/types';
import ProductQuickActions from '@/features/products/components/ProductQuickActions';
import { formatDate } from '@/shared/utils';
import { productsApi, categoriesApi } from '@/lib/api/client';
import { getCachedProducts, setCachedProducts, getStoreIdFromToken, invalidateProductsCache } from '@/lib/cache/productsCache';
import { productSync } from '@/lib/sync/productSync';
import { Pagination } from '@/shared/components';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { useConfirmDialog } from '@/shared/contexts';
import { useResponsiveViewMode } from '@/shared/hooks';

// Advanced search filter types
interface AdvancedFilters {
  stockSort: 'none' | 'highest' | 'lowest';
  priceSort: 'none' | 'highest' | 'lowest';
  expirySort: 'none' | 'nearest' | 'furthest';
  categoryFilter: string; // categoryId or 'all'
}

interface ProductListPageProps {}

type LayoutType = 'table' | 'grid';

// Backend product interface
interface BackendProduct {
  id: string;
  _id?: string;
  name: string;
  barcode: string;
  costPrice: number;
  price: number;
  stock: number;
  categoryId?: string;
  brandId?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

const ProductListPage: React.FC<ProductListPageProps> = () => {
  const navigate = useNavigate();
  const { formatCurrency, currency } = useCurrency();
  const confirmDialog = useConfirmDialog();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const { viewMode: layout, setViewMode: setLayout } = useResponsiveViewMode('productList', 'table', 'grid');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedCostPrices, setRevealedCostPrices] = useState<Set<number>>(new Set());

  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    stockSort: 'none',
    priceSort: 'none',
    expirySort: 'none',
    categoryFilter: 'all',
  });
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Store all products for advanced filtering
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const LOW_STOCK_THRESHOLD = 10;

  // Store backend products with categoryId for mapping
  const [backendProducts, setBackendProducts] = useState<BackendProduct[]>([]);
  
  // Store category list for dropdown
  const [categoryList, setCategoryList] = useState<Array<{ id: string; name: string }>>([]);
  
  // Store all backend products for lookup (including from allProducts)
  const [allBackendProducts, setAllBackendProducts] = useState<BackendProduct[]>([]);

  // Helper function to convert MongoDB ObjectId or string to number
  const idToNumber = (id: string | undefined): number => {
    if (!id) return Date.now();
    // If it's already a number string, parse it
    if (/^\d+$/.test(id)) {
      return parseInt(id, 10);
    }
    // For MongoDB ObjectIds or other strings, create a hash
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) || Date.now();
  };

  // Fetch categories once (initial load)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingInitial(true);
        const categoriesRes = await categoriesApi.getCategories();
        const categoryMap: Record<string, string> = {};

        if (categoriesRes.success) {
          const categoriesData = (categoriesRes.data as any)?.categories || categoriesRes.data || [];
          const categoryListData = categoriesData.map((cat: any) => ({
            id: cat.id,
            name: cat.nameAr || cat.name || 'غير محدد',
          }));
          categoriesData.forEach((cat: any) => {
            categoryMap[cat.id] = cat.nameAr || cat.name || 'غير محدد';
          });
          setCategories(categoryMap);
          setCategoryList(categoryListData);
        }
      } catch (err: any) {
        console.error('Error fetching categories:', err);
        setError(err.message || 'حدث خطأ أثناء تحميل الفئات');
      } finally {
        setLoadingInitial(false);
      }
    };

    loadCategories();
  }, []);

  // Fetch products when filters/search/pagination change (without full page reload feel)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        setError(null);
        
        const storeId = getStoreIdFromToken();
        
        // For regular pagination mode, check cache first
        if (!isAdvancedMode && !searchTerm && currentPage === 1) {
          const cached = storeId ? getCachedProducts(storeId) : null;
          if (cached && cached.products.length > 0) {
            // Use cached products for first page
            const paginatedProducts = cached.products.slice(0, itemsPerPage);
            const mappedProducts: (Product & { categoryId?: string; backendId?: string })[] = paginatedProducts.map((p: BackendProduct) => ({
              id: idToNumber(p.id || p._id),
              name: p.name,
              category: p.categoryId ? (cached.categories[p.categoryId]?.name || categories[p.categoryId] || 'غير محدد') : 'غير محدد',
              brand: p.brandId || '',
              price: p.price || 0,
              cost: p.costPrice || 0,
              costPrice: p.costPrice || 0,
              stock: p.stock || 0,
              barcode: p.barcode || '',
              expiryDate: p.expiryDate || '',
              createdAt: p.createdAt || new Date().toISOString(),
              updatedAt: p.updatedAt || new Date().toISOString(),
              categoryId: p.categoryId,
              backendId: p.id || p._id,
            }));
            
            setProducts(mappedProducts);
            setBackendProducts(paginatedProducts);
            setTotalPages(Math.ceil(cached.products.length / itemsPerPage));
            setTotalProducts(cached.products.length);
            setLoadingProducts(false);
            
            // Refresh cache in background
            // Continue to API call below...
          }
        }

        // Fetch from API (with pagination for regular mode, or all for advanced mode)
        const apiParams = {
          page: isAdvancedMode ? undefined : currentPage,
          limit: isAdvancedMode ? undefined : itemsPerPage,
          all: isAdvancedMode, // Fetch all for advanced mode
          includeCategories: true, // Include category data
          search: (!isAdvancedMode && searchTerm) ? searchTerm.trim() : undefined,
        };
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[ProductListPage] Fetching products with params:', apiParams);
        }
        
        const productsRes = await productsApi.getProducts(apiParams);

        if (productsRes.success) {
          const responseData = productsRes.data as any;
          const productsData = responseData?.products || [];
          setBackendProducts(productsData);

          // Update pagination info - ensure it's always set correctly
          // The API response structure is: { success, message, products, pagination }
          // Note: productsRes.data is the ProductsPaginationResponse
          const paginationData = responseData?.pagination;
          
          // Debug logging to help diagnose pagination issues
          if (process.env.NODE_ENV === 'development') {
            console.log('[ProductListPage] API Response:', {
              hasPagination: !!paginationData,
              paginationData,
              productsCount: productsData.length,
              currentPage,
              itemsPerPage,
              isAdvancedMode,
              responseKeys: Object.keys(responseData || {}),
              fullResponseData: responseData
            });
          }
          
          if (!isAdvancedMode) {
            if (paginationData) {
              // Use pagination data from API
              const calculatedTotalPages = Math.max(1, paginationData.totalPages || 1);
              const calculatedTotalProducts = paginationData.totalProducts || 0;
              
              if (process.env.NODE_ENV === 'development') {
                console.log('[ProductListPage] Setting pagination from API:', {
                  totalPages: calculatedTotalPages,
                  totalProducts: calculatedTotalProducts,
                  willShowPagination: calculatedTotalPages > 1
                });
              }
              
              setTotalPages(calculatedTotalPages);
              setTotalProducts(calculatedTotalProducts);
            } else {
              // Pagination info missing - this shouldn't happen, but handle gracefully
              console.warn('[ProductListPage] ⚠️ Pagination info missing from API response', {
                hasResponseData: !!responseData,
                responseKeys: responseData ? Object.keys(responseData) : [],
                productsReceived: productsData.length,
                itemsPerPage,
                currentPage,
                fullResponse: responseData
              });
              
              // Fallback: If we got a full page of results, assume there are more pages
              // This is a temporary fix - the API should always return pagination
              if (productsData.length === itemsPerPage) {
                // Full page - estimate there are more pages
                // Set to at least 2 to show pagination controls
                // This allows user to try navigating, and we'll get real data on next page
                setTotalPages(Math.max(2, currentPage + 1));
                setTotalProducts(itemsPerPage * (currentPage + 1)); // Estimate
              } else {
                // Partial page - likely the last page
                setTotalPages(currentPage);
                setTotalProducts((currentPage - 1) * itemsPerPage + productsData.length);
              }
            }
          }

          // Build enriched category map from embedded category data
          const enrichedCategoryMap: Record<string, string> = { ...categories };
          productsData.forEach((p: any) => {
            if (p.category && p.categoryId) {
              enrichedCategoryMap[p.categoryId] = p.category.name || p.category.nameAr || categories[p.categoryId] || 'غير محدد';
            }
          });
          
          // Map backend products to frontend Product type with category names
          const mappedProducts: (Product & { categoryId?: string; backendId?: string })[] = productsData.map((p: BackendProduct) => ({
            id: idToNumber(p.id || p._id),
            name: p.name,
            category: p.categoryId ? ((p as any).category?.name || (p as any).category?.nameAr || enrichedCategoryMap[p.categoryId] || 'غير محدد') : 'غير محدد',
            brand: p.brandId || '',
            price: p.price || 0,
            cost: p.costPrice || 0,
            costPrice: p.costPrice || 0,
            stock: p.stock || 0,
            barcode: p.barcode || '',
            expiryDate: p.expiryDate || '',
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt || new Date().toISOString(),
            categoryId: p.categoryId, // Keep for filtering
            backendId: p.id || p._id, // Store backend ID for editing
          }));

          setProducts(mappedProducts);
          
          // Cache products if fetching all
          if (isAdvancedMode && storeId) {
            const categoryCacheMap: Record<string, any> = {};
            productsData.forEach((p: any) => {
              if (p.category && p.categoryId) {
                categoryCacheMap[p.categoryId] = p.category;
              }
            });
            setCachedProducts(storeId, productsData, categoryCacheMap);
          }
        } else {
          setError('فشل تحميل المنتجات');
        }
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError(err.message || 'حدث خطأ أثناء تحميل المنتجات');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [currentPage, itemsPerPage, searchTerm, isAdvancedMode, categories]);

  // Fetch all products from API (helper function) - defined before use
  const fetchAllProductsFromAPI = useCallback(async (storeId: string | null, categoryMap: Record<string, string>, searchTerm?: string) => {
    try {
      // Fetch all products for a single store in one request (optimized)
      const productsRes = await productsApi.getProducts({
        all: true, // Fetch all products
        includeCategories: true, // Include category data
        search: searchTerm || undefined, // Optional server-side search
      });

      if (productsRes.success) {
        const responseData = productsRes.data as any;
        const productsData = responseData?.products || [];
        
        // Build category map from embedded category data
        const enrichedCategoryMap: Record<string, string> = { ...categoryMap };
        productsData.forEach((p: any) => {
          if (p.category && p.categoryId) {
            enrichedCategoryMap[p.categoryId] = p.category.name || p.category.nameAr || categoryMap[p.categoryId] || 'غير محدد';
          }
        });
        
        const mappedProducts: (Product & { categoryId?: string; backendId?: string })[] = productsData.map((p: BackendProduct) => ({
          id: idToNumber(p.id || p._id),
          name: p.name,
          category: p.categoryId ? ((p as any).category?.name || (p as any).category?.nameAr || enrichedCategoryMap[p.categoryId] || 'غير محدد') : 'غير محدد',
          brand: p.brandId || '',
          price: p.price || 0,
          cost: p.costPrice || 0,
          costPrice: p.costPrice || 0,
          stock: p.stock || 0,
          barcode: p.barcode || '',
          expiryDate: p.expiryDate || '',
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString(),
          categoryId: p.categoryId, // Keep for filtering
          backendId: p.id || p._id, // Store backend ID for editing
        }));

        setAllProducts(mappedProducts);
        // Also store backend products for lookup
        setAllBackendProducts(productsData);
        
        // Cache the products and categories
        if (storeId) {
          const categoryCacheMap: Record<string, any> = {};
          productsData.forEach((p: any) => {
            if (p.category && p.categoryId) {
              categoryCacheMap[p.categoryId] = p.category;
            }
          });
          setCachedProducts(storeId, productsData, categoryCacheMap);
        }
      }
    } catch (err: any) {
      console.error('Error fetching all products from API:', err);
      throw err;
    }
  }, []);

  // Fetch all products for advanced search (optimized - single request with caching)
  const fetchAllProductsForAdvancedSearch = useCallback(async (categoryMap: Record<string, string>, searchTerm?: string) => {
    try {
      const storeId = getStoreIdFromToken();
      
      // Try cache first
      const cached = storeId ? getCachedProducts(storeId) : null;
      if (cached && cached.products.length > 0 && !searchTerm) {
        // Use cached products if available and no search term
        console.log(`Using ${cached.products.length} cached products for advanced search`);
        const mappedProducts: (Product & { categoryId?: string; backendId?: string })[] = cached.products.map((p: BackendProduct) => ({
          id: idToNumber(p.id || p._id),
          name: p.name,
          category: p.categoryId ? (cached.categories[p.categoryId]?.name || categoryMap[p.categoryId] || 'غير محدد') : 'غير محدد',
          brand: p.brandId || '',
          price: p.price || 0,
          cost: p.costPrice || 0,
          costPrice: p.costPrice || 0,
          stock: p.stock || 0,
          barcode: p.barcode || '',
          expiryDate: p.expiryDate || '',
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString(),
          categoryId: p.categoryId,
          backendId: p.id || p._id,
        }));
        
        // Filter by search term if provided
        let filtered = mappedProducts;
        if (searchTerm) {
          const searchTermTrimmed = searchTerm.trim().toLowerCase();
          filtered = mappedProducts.filter((product) => 
            product.name.toLowerCase().includes(searchTermTrimmed) ||
            product.barcode.toLowerCase().includes(searchTermTrimmed)
          );
        }
        
        setAllProducts(filtered);
        setAllBackendProducts(cached.products);
        
        // Refresh cache in background
        fetchAllProductsFromAPI(storeId, categoryMap, searchTerm);
        return;
      }
      
      // Fetch from API
      await fetchAllProductsFromAPI(storeId, categoryMap, searchTerm);
    } catch (err: any) {
      console.error('Error fetching all products for advanced search:', err);
    }
  }, [fetchAllProductsFromAPI]);

  // Update category names when categories are loaded (for products that were loaded before categories)
  useEffect(() => {
    if (Object.keys(categories).length > 0 && backendProducts.length > 0) {
      const mappedProducts: (Product & { categoryId?: string; backendId?: string })[] = backendProducts.map((p: BackendProduct) => ({
        id: idToNumber(p.id || p._id),
        name: p.name,
        category: p.categoryId ? categories[p.categoryId] || 'غير محدد' : 'غير محدد',
        brand: p.brandId || '',
        price: p.price || 0,
        cost: p.costPrice || 0,
        costPrice: p.costPrice || 0,
        stock: p.stock || 0,
        barcode: p.barcode || '',
        expiryDate: p.expiryDate || '',
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt || new Date().toISOString(),
        categoryId: p.categoryId, // Keep for filtering
        backendId: p.id || p._id, // Store backend ID for editing
      }));
      setProducts(mappedProducts);
    }
  }, [categories, backendProducts]);

  // Fetch all products when advanced mode is enabled (but not if already fetched for search)
  useEffect(() => {
    if (isAdvancedMode && Object.keys(categories).length > 0 && allProducts.length === 0) {
      fetchAllProductsForAdvancedSearch(categories, searchTerm.trim() || undefined);
    }
  }, [isAdvancedMode, categories, allProducts.length, fetchAllProductsForAdvancedSearch, searchTerm]);

  // Reset to page 1 when search term changes
  // With server-side search, we don't need to fetch all products for basic search
  useEffect(() => {
    if (searchTerm && searchTerm.trim()) {
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
      // Only enable advanced mode if there are advanced filters active
      // Otherwise, use server-side search which is more efficient
      const hasFilters = advancedFilters.stockSort !== 'none' ||
                        advancedFilters.priceSort !== 'none' ||
                        advancedFilters.expirySort !== 'none' ||
                        advancedFilters.categoryFilter !== 'all';
      
      if (hasFilters && !isAdvancedMode && Object.keys(categories).length > 0) {
        // If advanced filters are active, fetch all products for client-side filtering
        setIsAdvancedMode(true);
        fetchAllProductsForAdvancedSearch(categories, searchTerm.trim());
      } else if (hasFilters && isAdvancedMode && allProducts.length === 0 && Object.keys(categories).length > 0) {
        // If advanced mode is already enabled but products aren't loaded, fetch them
        fetchAllProductsForAdvancedSearch(categories, searchTerm.trim());
      }
    } else {
      // If search is cleared and no advanced filters are active, disable advanced mode
      const hasFilters = advancedFilters.stockSort !== 'none' ||
                        advancedFilters.priceSort !== 'none' ||
                        advancedFilters.expirySort !== 'none' ||
                        advancedFilters.categoryFilter !== 'all';
      if (!hasFilters) {
        setIsAdvancedMode(false);
        setAllProducts([]);
      }
    }
  }, [searchTerm, isAdvancedMode, allProducts.length, categories, advancedFilters, currentPage, fetchAllProductsForAdvancedSearch]);

  // Check if any advanced filter is active
  const hasActiveAdvancedFilters = useMemo(() => {
    return (
      advancedFilters.stockSort !== 'none' ||
      advancedFilters.priceSort !== 'none' ||
      advancedFilters.expirySort !== 'none' ||
      advancedFilters.categoryFilter !== 'all'
    );
  }, [advancedFilters]);

  // Handle advanced filtering and sorting
  const filteredProducts = useMemo(() => {
    // When not in advanced mode, use products directly (already filtered by server-side search)
    // When in advanced mode, use allProducts and apply client-side filters
    if (!isAdvancedMode) {
      // Server-side search is already applied, just return the products
      return [...products];
    }

    // Advanced mode: use allProducts and apply client-side filters
    let filtered: (Product & { categoryId?: string; backendId?: string })[] = 
      allProducts.length > 0 ? [...allProducts] : [...products];

    // Apply text search filter in advanced mode (when we have all products loaded)
    if (searchTerm) {
      const searchTermTrimmed = searchTerm.trim();
      if (searchTermTrimmed) {
        // Normalize Arabic text for better matching (remove diacritics, normalize spaces)
        const normalizeText = (text: string): string => {
          return text
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ') // Normalize multiple spaces
            .replace(/[\u064B-\u065F\u0670]/g, ''); // Remove Arabic diacritics
        };

        const normalizedSearchTerm = normalizeText(searchTermTrimmed);
        const lowercasedSearchTerm = searchTermTrimmed.toLowerCase();
        
        filtered = filtered.filter((product) => {
          // Normalize and check
          const normalizedName = normalizeText(product.name || '');
          const normalizedBarcode = normalizeText(product.barcode || '');
          const normalizedCategory = normalizeText(product.category || '');
          
          // Check normalized matches (handles Arabic diacritics)
          const normalizedMatch = 
            normalizedName.includes(normalizedSearchTerm) ||
            normalizedBarcode.includes(normalizedSearchTerm) ||
            normalizedCategory.includes(normalizedSearchTerm);
          
          // Also check direct lowercase matches (for exact matches and non-Arabic text)
          const directMatch = 
            (product.name && product.name.toLowerCase().includes(lowercasedSearchTerm)) ||
            (product.barcode && product.barcode.toLowerCase().includes(lowercasedSearchTerm)) ||
            (product.category && product.category.toLowerCase().includes(lowercasedSearchTerm));
          
          return normalizedMatch || directMatch;
        });
      }
    }

    // Apply category filter
    if (advancedFilters.categoryFilter !== 'all') {
      filtered = filtered.filter((product) => {
        return product.categoryId === advancedFilters.categoryFilter;
      });
    }

    // Apply stock sorting
    if (advancedFilters.stockSort === 'highest') {
      filtered.sort((a, b) => b.stock - a.stock);
    } else if (advancedFilters.stockSort === 'lowest') {
      filtered.sort((a, b) => a.stock - b.stock);
    }

    // Apply price sorting
    if (advancedFilters.priceSort === 'highest') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (advancedFilters.priceSort === 'lowest') {
      filtered.sort((a, b) => a.price - b.price);
    }

    // Apply expiry date sorting
    if (advancedFilters.expirySort === 'nearest') {
      filtered.sort((a, b) => {
        const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      });
    } else if (advancedFilters.expirySort === 'furthest') {
      filtered.sort((a, b) => {
        const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
        const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
        return dateB - dateA;
      });
    }

    return filtered;
  }, [searchTerm, products, allProducts, isAdvancedMode, advancedFilters]);

  // Handle page change
  const handlePageChange = (page: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ProductListPage] Page change requested:', {
        from: currentPage,
        to: page,
        totalPages,
        calculatedTotalPages: isAdvancedMode 
          ? Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage))
          : totalPages
      });
    }
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Handle advanced filter changes
  const handleAdvancedFilterChange = (filterType: keyof AdvancedFilters, value: string) => {
    setAdvancedFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    
    // Enable advanced mode if any filter is active
    if (value !== 'none' && value !== 'all') {
      if (!isAdvancedMode && Object.keys(categories).length > 0) {
        setIsAdvancedMode(true);
        // Fetch all products when enabling advanced mode
        fetchAllProductsForAdvancedSearch(categories, searchTerm.trim() || undefined);
      }
    } else {
      // Check if any other filter is still active
      const newFilters = { ...advancedFilters, [filterType]: value };
      const stillActive = newFilters.stockSort !== 'none' || 
                         newFilters.priceSort !== 'none' || 
                         newFilters.expirySort !== 'none' || 
                         newFilters.categoryFilter !== 'all';
      if (!stillActive) {
        setIsAdvancedMode(false);
        setAllProducts([]);
      }
    }
    
    setCurrentPage(1); // Reset to first page
  };

  // Clear all advanced filters
  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      stockSort: 'none',
      priceSort: 'none',
      expirySort: 'none',
      categoryFilter: 'all',
    });
    setIsAdvancedMode(false);
    setCurrentPage(1);
  };

  // Calculate pagination for filtered products
  const paginatedProducts = useMemo(() => {
    if (isAdvancedMode) {
      // In advanced mode, paginate the filtered results
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return filteredProducts.slice(startIndex, endIndex);
    }
    return filteredProducts;
  }, [filteredProducts, currentPage, itemsPerPage, isAdvancedMode]);

  // Calculate total pages for filtered products
  const calculatedTotalPages = useMemo(() => {
    if (isAdvancedMode) {
      const pages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
      if (process.env.NODE_ENV === 'development') {
        console.log('[ProductListPage] Calculated total pages (advanced mode):', {
          filteredProducts: filteredProducts.length,
          itemsPerPage,
          pages
        });
      }
      return pages;
    }
    // In regular mode, use totalPages from API, but ensure it's at least 1
    const pages = Math.max(1, totalPages || 1);
    if (process.env.NODE_ENV === 'development') {
      console.log('[ProductListPage] Calculated total pages (regular mode):', {
        totalPages,
        pages,
        willShowPagination: pages > 1
      });
    }
    return pages;
  }, [filteredProducts.length, itemsPerPage, isAdvancedMode, totalPages]);

  // Calculate total products for filtered results
  const calculatedTotalProducts = useMemo(() => {
    if (isAdvancedMode) {
      return filteredProducts.length;
    }
    return totalProducts;
  }, [filteredProducts.length, isAdvancedMode, totalProducts]);

  const handleEditProduct = (productId: number) => {
    // First, try to find the product in the displayed products (filtered/paginated)
    // This works for both regular and filtered results
    const displayedProduct = paginatedProducts.find((p) => p.id === productId) ||
                            filteredProducts.find((p) => p.id === productId) ||
                            products.find((p) => p.id === productId) ||
                            allProducts.find((p) => p.id === productId);

    // If we found the product and it has a backendId, use it directly
    if (displayedProduct && (displayedProduct as any).backendId) {
      const productBackendId = (displayedProduct as any).backendId;
      navigate(`/products/edit/${productBackendId}`);
      return;
    }

    // Fallback: Find the backend product to get the actual MongoDB ID
    // Check both backendProducts and allBackendProducts
    const backendProduct = backendProducts.find(
      (p) => idToNumber(p.id || p._id) === productId
    ) || allBackendProducts.find(
      (p) => idToNumber(p.id || p._id) === productId
    );

    if (!backendProduct) {
      alert('المنتج غير موجود');
      return;
    }

    const productBackendId = backendProduct.id || backendProduct._id || productId.toString();
    navigate(`/products/edit/${productBackendId}`);
  };

  const handleDeleteProduct = async (productId: number) => {
    const confirmed = await confirmDialog({
      title: AR_LABELS.confirmDeleteTitle,
      message: `هل أنت متأكد من حذف المنتج رقم ${productId}؟`,
    });
    if (!confirmed) return;

    try {
      // Find the product to get its actual backend ID
      const product = products.find((p) => p.id === productId);
      if (!product) {
        alert('المنتج غير موجود');
        return;
      }

      // Find the backend product to get the actual MongoDB ID
      const backendProduct = backendProducts.find(
        (p) => idToNumber(p.id || p._id) === productId
      );

      if (!backendProduct) {
        alert('المنتج غير موجود في قاعدة البيانات');
        return;
      }

      const productBackendId = backendProduct.id || backendProduct._id || productId.toString();
      const response = await productsApi.deleteProduct(productBackendId);

      if (response.success) {
        // Delete product from IndexedDB immediately
        try {
          await productSync.syncAfterDelete(productBackendId);
          console.log('[ProductListPage] Successfully removed product from IndexedDB');
        } catch (syncError) {
          console.error('[ProductListPage] Error removing product from IndexedDB:', syncError);
          // Continue anyway - the product was deleted successfully
        }
        
        // Invalidate cache (backup)
        const storeId = getStoreIdFromToken();
        if (storeId) {
          invalidateProductsCache(storeId);
        }
        
        // Remove product from both local states
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        setBackendProducts((prev) =>
          prev.filter((p) => (p.id || p._id) !== productBackendId)
        );
        setAllProducts((prev) => prev.filter((p) => p.id !== productId));
        setAllBackendProducts((prev) =>
          prev.filter((p) => (p.id || p._id) !== productBackendId)
        );
        alert('تم حذف المنتج بنجاح');
      } else {
        alert('فشل حذف المنتج: ' + (response.message || 'خطأ غير معروف'));
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert('حدث خطأ أثناء حذف المنتج: ' + (error.message || 'خطأ غير معروف'));
    }
  };

  const toggleCostPriceVisibility = (productId: number) => {
    setRevealedCostPrices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'import':
        alert('وظيفة الاستيراد قيد التطوير');
        break;
      case 'export':
        alert('وظيفة التصدير قيد التطوير');
        break;
      case 'print':
        alert('وظيفة طباعة الباركود قيد التطوير');
        break;
      case 'search':
        // Focus on search input
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
        break;
      default:
        break;
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-600 dark:text-gray-400">{AR_LABELS.loading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="space-y-6">
        <ProductQuickActions
          onAddProduct={() => {}}
          onImportProducts={() => handleQuickAction('import')}
          onExportProducts={() => handleQuickAction('export')}
          onPrintBarcodes={() => handleQuickAction('print')}
          onSearchProducts={() => handleQuickAction('search')}
        />
      </div>

      {/* Control Bar: Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Search Bar */}
            <div className="relative w-full md:w-1/2 lg:w-1/3">
              <input
                type="text"
                placeholder={AR_LABELS.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
              />
              <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            {/* Layout Toggle and Items Per Page */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
              {/* Advanced Search Toggle */}
              <button
                onClick={() => {
                  setShowAdvancedSearch(!showAdvancedSearch);
                  if (!showAdvancedSearch && !isAdvancedMode && hasActiveAdvancedFilters) {
                    setIsAdvancedMode(true);
                  }
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                  showAdvancedSearch || hasActiveAdvancedFilters
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                بحث متقدم
                {hasActiveAdvancedFilters && (
                  <span className="mr-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-orange-500 bg-white rounded-full">
                    !
                  </span>
                )}
              </button>
              {/* Items Per Page Selector */}
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value={10}>10 لكل صفحة</option>
                <option value={20}>20 لكل صفحة</option>
                <option value={30}>30 لكل صفحة</option>
                <option value={50}>50 لكل صفحة</option>
              </select>
              <button onClick={() => setLayout(layout === 'table' ? 'grid' : 'table')} className="p-2 border dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
                {layout === 'table' ? <GridViewIcon/> : <TableViewIcon />}
              </button>
            </div>
          </div>

          {/* Inline loading indicator for product fetches - Reserve space */}
          <div className="text-sm text-gray-500 dark:text-gray-400 flex justify-end min-h-[24px]">
            {loadingProducts && <span>جاري تحميل المنتجات...</span>}
          </div>

          {/* Advanced Search Panel - Reserve space to prevent layout shift */}
          <div className={`border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 transition-all duration-200 overflow-hidden ${showAdvancedSearch ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Stock Sort */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ترتيب حسب المخزون
                  </label>
                  <select
                    value={advancedFilters.stockSort}
                    onChange={(e) => handleAdvancedFilterChange('stockSort', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="none">بدون ترتيب</option>
                    <option value="highest">أعلى مخزون</option>
                    <option value="lowest">أقل مخزون</option>
                  </select>
                </div>

                {/* Price Sort */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ترتيب حسب السعر
                  </label>
                  <select
                    value={advancedFilters.priceSort}
                    onChange={(e) => handleAdvancedFilterChange('priceSort', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="none">بدون ترتيب</option>
                    <option value="highest">أعلى سعر</option>
                    <option value="lowest">أقل سعر</option>
                  </select>
                </div>

                {/* Expiry Sort */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ترتيب حسب تاريخ الانتهاء
                  </label>
                  <select
                    value={advancedFilters.expirySort}
                    onChange={(e) => handleAdvancedFilterChange('expirySort', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="none">بدون ترتيب</option>
                    <option value="nearest">أقرب تاريخ انتهاء</option>
                    <option value="furthest">أبعد تاريخ انتهاء</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    تصفية حسب الفئة
                  </label>
                  <select
                    value={advancedFilters.categoryFilter}
                    onChange={(e) => handleAdvancedFilterChange('categoryFilter', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">جميع الفئات</option>
                    {categoryList.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveAdvancedFilters && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearAdvancedFilters}
                    className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    مسح جميع الفلاتر
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Product Table/Grid - Reserve space to prevent layout shift */}
      {layout === 'table' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto">
            {loadingProducts && paginatedProducts.length === 0 ? (
              // Skeleton table with fixed dimensions
              <div className="p-6 space-y-4">
                {Array.from({ length: itemsPerPage }).map((_, index) => (
                  <div key={`skeleton-row-${index}`} className="flex items-center gap-4 h-16">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4"></div>
                    </div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20 flex-shrink-0"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16 flex-shrink-0"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16 flex-shrink-0"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24 flex-shrink-0"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse w-24 flex-shrink-0"></div>
                  </div>
                ))}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">#</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.productName}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.barcode}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.categoryName}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">سعر التكلفة</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">سعر البيع</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.stock}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.expiryDate}</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">{AR_LABELS.actions}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedProducts.length > 0 ? paginatedProducts.map((product, index) => {
                  // Calculate row number based on current page and index
                  const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-center"><div className="text-sm font-medium text-gray-500 dark:text-gray-400">{rowNumber}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-700 dark:text-gray-300">{product.barcode}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-700 dark:text-gray-300">{product.category}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleCostPriceVisibility(product.id)}
                        className="text-sm text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-200 cursor-pointer font-mono"
                        title={revealedCostPrices.has(product.id) ? 'انقر لإخفاء سعر التكلفة' : 'انقر لإظهار سعر التكلفة'}
                      >
                        {revealedCostPrices.has(product.id) 
                          ? formatCurrency(product.costPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : `•••• ${currency.symbol}`
                        }
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(product.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${product.stock < LOW_STOCK_THRESHOLD ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-700 dark:text-gray-300">{formatDate(product.expiryDate)}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button onClick={() => handleEditProduct(product.id)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 ml-4 p-2 rounded-full hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={`${AR_LABELS.edit} ${product.name}`}><EditIcon /></button>
                      <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={`${AR_LABELS.delete} ${product.name}`}><DeleteIcon /></button>
                    </td>
                  </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">{AR_LABELS.noSalesFound}</td>
                  </tr>
                )}
              </tbody>
            </table>
            )}
          </div>
          
          {/* Pagination */}
          {calculatedTotalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                totalPages={calculatedTotalPages}
                totalItems={calculatedTotalProducts}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 overflow-hidden min-h-[400px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
            {loadingProducts && paginatedProducts.length === 0 ? (
              // Skeleton grid with fixed dimensions
              Array.from({ length: itemsPerPage }).map((_, index) => (
                <div key={`skeleton-card-${index}`} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6 space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-4"></div>
                </div>
              ))
            ) : paginatedProducts.length > 0 ? paginatedProducts.map((product) => (
              <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6 space-y-3 flex flex-col justify-between hover:shadow-md transition-all duration-300 group">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{product.name}</h3>
                    <span className={`text-xs font-semibold ${product.stock < LOW_STOCK_THRESHOLD ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {product.stock}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{AR_LABELS.barcode}: {product.barcode}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{AR_LABELS.categoryName}: {product.category}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    سعر التكلفة:{' '}
                  <button
                    onClick={() => toggleCostPriceVisibility(product.id)}
                    className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-200 cursor-pointer font-mono"
                    title={revealedCostPrices.has(product.id) ? 'انقر لإخفاء سعر التكلفة' : 'انقر لإظهار سعر التكلفة'}
                  >
                    {revealedCostPrices.has(product.id) 
                      ? formatCurrency(product.costPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : `•••• ${currency.symbol}`
                    }
                  </button>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">سعر البيع: {formatCurrency(product.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{AR_LABELS.expiryDate}: {formatDate(product.expiryDate)}</p>
                </div>
                <div className="border-t dark:border-gray-700 pt-2 flex justify-end space-x-2 space-x-reverse">
                  <button onClick={() => handleEditProduct(product.id)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1"><EditIcon /></button>
                  <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"><DeleteIcon /></button>
                </div>
              </div>
            )) : (
              <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-10">{AR_LABELS.noSalesFound}</div>
            )}
          </div>
          
        {/* Pagination for Grid View */}
        {(() => {
          const shouldShowPagination = calculatedTotalPages > 1;
          if (process.env.NODE_ENV === 'development' && !shouldShowPagination && totalProducts > itemsPerPage) {
            console.warn('[ProductListPage] Pagination should show but calculatedTotalPages is', calculatedTotalPages, {
              totalProducts,
              itemsPerPage,
              totalPages,
              isAdvancedMode
            });
          }
          return shouldShowPagination ? (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                totalPages={calculatedTotalPages}
                totalItems={calculatedTotalProducts}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
              />
            </div>
          ) : null;
        })()}
        </div>
      )}
    </div>
  );
};

export default ProductListPage;
