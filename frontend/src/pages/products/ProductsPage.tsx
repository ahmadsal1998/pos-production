import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AR_LABELS, PlusIcon, SearchIcon, FilterIcon, GridViewIcon, TableViewIcon, EditIcon, DeleteIcon, ViewIcon } from '../../shared/constants';
import { Product } from '../../shared/types';
import { MetricCard } from '../../shared/components/ui/MetricCard';
import { productsApi, ApiError } from '@/lib/api/client';
import { getCachedProducts, setCachedProducts, invalidateProductsCache, getStoreIdFromToken } from '@/lib/cache/productsCache';
import { useResponsiveViewMode } from '../../shared/hooks';

// Enhanced Product interface with image and status
interface EnhancedProduct extends Product {
  image?: string;
  status: 'available' | 'out_of_stock' | 'low_stock';
  description?: string;
  sku?: string;
}

interface ProductsPageProps {
  onAddProduct?: () => void;
  onProductClick?: (product: EnhancedProduct) => void;
}

const ProductsPage: React.FC<ProductsPageProps> = ({ onAddProduct, onProductClick }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<EnhancedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const { viewMode, setViewMode } = useResponsiveViewMode('products', 'table', 'grid');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch products from API (helper function)
  const fetchProductsFromAPI = async (storeId: string | null) => {
    try {
      // Fetch all products for a single store in one request
      const response = await productsApi.getProducts({
        all: true, // Fetch all products for the store
        includeCategories: true, // Include category data
      });
      const backendResponse = response.data;
      
      if (backendResponse?.success && Array.isArray(backendResponse.products)) {
        // Transform API products to EnhancedProduct format
        const transformedProducts: EnhancedProduct[] = backendResponse.products.map((p: any) => {
          // Determine status based on stock
          let status: 'available' | 'out_of_stock' | 'low_stock' = 'available';
          const stock = p.stock || p.quantity || 0;
          if (stock === 0) {
            status = 'out_of_stock';
          } else if (stock < (p.lowStockAlert || 10)) {
            status = 'low_stock';
          }

          return {
            id: typeof p.id === 'string' ? parseInt(p.id) || 0 : p.id || 0,
            name: p.name || '',
            category: p.category?.nameAr || p.category?.name || p.category || '',
            price: p.retailSellingPrice || p.sellingPrice || p.price || 0,
            costPrice: p.costPrice || p.cost || 0,
            stock: stock,
            barcode: p.primaryBarcode || p.barcode || '',
            expiryDate: p.expiryDate || '',
            createdAt: p.createdAt || new Date().toISOString(),
            image: p.imageUrl || p.image || undefined,
            status: status,
            description: p.description || undefined,
            sku: p.internalSKU || p.sku || undefined,
          };
        });
        
        setProducts(transformedProducts);
        console.log(`Loaded ${transformedProducts.length} products from API`);
        
        // Cache the products and categories
        if (storeId) {
          const categoryMap: Record<string, any> = {};
          backendResponse.products.forEach((p: any) => {
            if (p.category && p.categoryId) {
              categoryMap[p.categoryId] = p.category;
            }
          });
          setCachedProducts(storeId, backendResponse.products, categoryMap);
        }
      } else {
        setProducts([]);
        console.log('No products found in database');
      }
    } catch (err: any) {
      throw err; // Re-throw to be handled by caller
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch products from API with caching
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to get from cache first
      const storeId = getStoreIdFromToken();
      const cached = storeId ? getCachedProducts(storeId) : null;
      
      if (cached && cached.products.length > 0) {
        console.log(`Loading ${cached.products.length} products from cache`);
        // Transform cached products to EnhancedProduct format
        const transformedProducts: EnhancedProduct[] = cached.products.map((p: any) => {
          let status: 'available' | 'out_of_stock' | 'low_stock' = 'available';
          const stock = p.stock || p.quantity || 0;
          if (stock === 0) {
            status = 'out_of_stock';
          } else if (stock < (p.lowStockAlert || 10)) {
            status = 'low_stock';
          }

          return {
            id: typeof p.id === 'string' ? parseInt(p.id) || 0 : p.id || 0,
            name: p.name || '',
            category: p.category?.nameAr || p.category?.name || p.category || '',
            price: p.retailSellingPrice || p.sellingPrice || p.price || 0,
            costPrice: p.costPrice || p.cost || 0,
            stock: stock,
            barcode: p.primaryBarcode || p.barcode || '',
            expiryDate: p.expiryDate || '',
            createdAt: p.createdAt || new Date().toISOString(),
            image: p.imageUrl || p.image || undefined,
            status: status,
            description: p.description || undefined,
            sku: p.internalSKU || p.sku || undefined,
          };
        });
        
        setProducts(transformedProducts);
        setIsLoading(false);
        
        // Fetch fresh data in background to update cache
        fetchProductsFromAPI(storeId);
        return;
      }

      // No cache, fetch from API
      await fetchProductsFromAPI(storeId);
    } catch (err: any) {
      const apiError = err as ApiError;
      console.error('Error fetching products:', apiError);
      if (apiError.status === 401 || apiError.status === 403) {
        navigate('/login', { replace: true });
        return;
      }
      setError(apiError.message || 'فشل تحميل المنتجات');
      setProducts([]);
      setIsLoading(false);
    }
  }, [navigate]);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Get unique categories and statuses
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(products.map(p => p.category)));
    return ['all', ...uniqueCategories];
  }, [products]);

  const statuses = useMemo(() => [
    { value: 'all', label: 'جميع الحالات' },
    { value: 'available', label: 'متوفر' },
    { value: 'low_stock', label: 'مخزون قليل' },
    { value: 'out_of_stock', label: 'نفد المخزون' }
  ], []);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'stock':
          aValue = a.stock;
          bValue = b.stock;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [products, searchTerm, selectedCategory, selectedStatus, sortBy, sortOrder]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const lowStockCount = products.filter(p => p.stock < 10).length;
    const outOfStockCount = products.filter(p => p.stock === 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const totalCost = products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);
    const profitMargin = totalValue > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 0;

    return [
      { id: 1, title: 'إجمالي المنتجات', value: products.length.toString(), icon: <div className="w-6 h-6 bg-blue-500 rounded"></div>, bgColor: 'bg-blue-100', valueColor: 'text-blue-600' },
      { id: 2, title: 'منتجات قليلة المخزون', value: lowStockCount.toString(), icon: <div className="w-6 h-6 bg-yellow-500 rounded"></div>, bgColor: 'bg-yellow-100', valueColor: 'text-yellow-600' },
      { id: 3, title: 'نفد المخزون', value: outOfStockCount.toString(), icon: <div className="w-6 h-6 bg-red-500 rounded"></div>, bgColor: 'bg-red-100', valueColor: 'text-red-600' },
      { id: 4, title: 'القيمة الإجمالية', value: `${totalValue.toFixed(2)} ر.س`, icon: <div className="w-6 h-6 bg-green-500 rounded"></div>, bgColor: 'bg-green-100', valueColor: 'text-green-600' },
    ];
  }, [products]);

  const handleAddProduct = () => {
    if (onAddProduct) {
      onAddProduct();
    } else {
      console.log('إضافة منتج جديد - سيتم فتح نموذج إضافة المنتج');
      alert('إضافة منتج جديد - سيتم فتح نموذج إضافة المنتج');
    }
  };

  const handleEditProduct = (product: EnhancedProduct) => {
    console.log('تعديل المنتج:', product);
    alert(`تعديل المنتج: ${product.name}`);
  };

  const handleDeleteProduct = (product: EnhancedProduct) => {
    console.log('حذف المنتج:', product);
    if (confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟`)) {
      alert(`تم حذف المنتج: ${product.name}`);
    }
  };

  const handleViewProduct = (product: EnhancedProduct) => {
    console.log('عرض تفاصيل المنتج:', product);
    if (onProductClick) {
      onProductClick(product);
    } else {
      alert(`عرض تفاصيل المنتج: ${product.name}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { label: 'متوفر', className: 'bg-green-100 text-green-800' },
      low_stock: { label: 'مخزون قليل', className: 'bg-yellow-100 text-yellow-800' },
      out_of_stock: { label: 'نفد المخزون', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const ProductCard: React.FC<{ product: EnhancedProduct }> = ({ product }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
      {/* Product Image - Fixed aspect ratio to prevent layout shift */}
      <div className="relative w-full aspect-[4/3] bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <img
          src={product.image || 'https://via.placeholder.com/300x200?text=No+Image'}
          alt={product.name}
          className="w-full h-full object-cover"
          width="300"
          height="200"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://via.placeholder.com/300x200?text=No+Image';
          }}
        />
        <div className="absolute top-2 right-2">
          {getStatusBadge(product.status)}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-2">{product.name}</h3>
        </div>
        
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <div className="flex justify-between">
            <span>الفئة:</span>
            <span className="font-medium">{product.category}</span>
          </div>
          <div className="flex justify-between">
            <span>السعر:</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{product.price} ر.س</span>
          </div>
          <div className="flex justify-between">
            <span>المخزون:</span>
            <span className="font-medium">{product.stock} قطعة</span>
          </div>
          {product.sku && (
            <div className="flex justify-between">
              <span>SKU:</span>
              <span className="font-mono text-xs">{product.sku}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewProduct(product);
            }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            <ViewIcon />
            عرض
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditProduct(product);
            }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors"
          >
            <EditIcon />
            تعديل
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteProduct(product);
            }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
          >
            <DeleteIcon />
            حذف
          </button>
        </div>
      </div>
    </div>
  );

  const ProductTableRow: React.FC<{ product: EnhancedProduct }> = ({ product }) => (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            <img
              className="h-12 w-12 object-cover"
              src={product.image || 'https://via.placeholder.com/48x48?text=No+Image'}
              alt={product.name}
              width="48"
              height="48"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/48x48?text=No+Image';
              }}
            />
          </div>
          <div className="mr-4">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{product.sku}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {product.category}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
        {product.price} ر.س
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {product.stock} قطعة
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge(product.status)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex gap-2">
          <button
            onClick={() => handleViewProduct(product)}
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
            title="عرض"
          >
            <ViewIcon />
          </button>
          <button
            onClick={() => handleEditProduct(product)}
            className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
            title="تعديل"
          >
            <EditIcon />
          </button>
          <button
            onClick={() => handleDeleteProduct(product)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            title="حذف"
          >
            <DeleteIcon />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Products</h1>
          <p className="text-gray-600 dark:text-gray-400">إدارة جميع المنتجات في النظام</p>
        </div>
        <button
          onClick={handleAddProduct}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
        >
          <PlusIcon className="h-5 w-5" />
          + Add Product
        </button>
      </div>

      {/* Metrics - Reserve space to prevent layout shift */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[120px]">
        {metrics.map(metric => (
          <MetricCard key={metric.id} {...metric} />
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في المنتجات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'جميع الفئات' : category}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {statuses.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          {/* Sort Options */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="name-asc">الاسم (أ-ي)</option>
            <option value="name-desc">الاسم (ي-أ)</option>
            <option value="price-asc">السعر (منخفض-عالي)</option>
            <option value="price-desc">السعر (عالي-منخفض)</option>
            <option value="stock-asc">المخزون (قليل-كثير)</option>
            <option value="stock-desc">المخزون (كثير-قليل)</option>
            <option value="createdAt-desc">الأحدث أولاً</option>
            <option value="createdAt-asc">الأقدم أولاً</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              title="عرض الشبكة"
            >
              <GridViewIcon />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 ${viewMode === 'table' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              title="عرض الجدول"
            >
              <TableViewIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Products Display - Reserve space to prevent layout shift */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm min-h-[400px]">
        {viewMode === 'grid' ? (
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isLoading ? (
                // Skeleton loaders with fixed dimensions
                Array.from({ length: 8 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="w-full aspect-[4/3] bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-4"></div>
                    </div>
                  </div>
                ))
              ) : (
                filteredAndSortedProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))
              )}
            </div>
            {!isLoading && filteredAndSortedProducts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400">لا توجد منتجات تطابق معايير البحث</p>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {isLoading ? (
              // Skeleton table with fixed dimensions
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={`skeleton-row-${index}`} className="flex items-center gap-4 h-16">
                    <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4"></div>
                    </div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse w-24"></div>
                  </div>
                ))}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    المنتج
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الفئة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    السعر
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    المخزون
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedProducts.map(product => (
                  <ProductTableRow key={product.id} product={product} />
                ))}
                  </tbody>
              </table>
            )}
            {!isLoading && filteredAndSortedProducts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400">لا توجد منتجات تطابق معايير البحث</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}


      {/* Results Summary */}
      {!isLoading && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          عرض {filteredAndSortedProducts.length} من أصل {products.length} منتج
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
