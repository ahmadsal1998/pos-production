import React, { useState, useMemo } from 'react';
import { AR_LABELS, PlusIcon, SearchIcon, FilterIcon, GridViewIcon, TableViewIcon, EditIcon, DeleteIcon, ViewIcon } from '../../shared/constants';
import { Product } from '../../shared/types';
import { MetricCard } from '../../shared/components/ui/MetricCard';

// Enhanced Product interface with image and status
interface EnhancedProduct extends Product {
  image?: string;
  status: 'available' | 'out_of_stock' | 'low_stock';
  description?: string;
  sku?: string;
}

// Mock data for products with enhanced properties
const mockProducts: EnhancedProduct[] = [
  { 
    id: 1, 
    name: 'لابتوب Dell XPS 15', 
    category: 'إلكترونيات', 
    price: 1200.00, 
    costPrice: 950.00, 
    stock: 50, 
    barcode: 'DELL-XPS15-12345', 
    expiryDate: '2025-12-31', 
    createdAt: '2023-01-15',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=200&fit=crop',
    status: 'available',
    description: 'لابتوب عالي الأداء للعمل والألعاب',
    sku: 'DELL-XPS15-001'
  },
  { 
    id: 2, 
    name: 'هاتف Samsung Galaxy S23', 
    category: 'إلكترونيات', 
    price: 899.99, 
    costPrice: 700.00, 
    stock: 120, 
    barcode: 'SAM-S23-67890', 
    expiryDate: '2026-06-30', 
    createdAt: new Date().toISOString(),
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=200&fit=crop',
    status: 'available',
    description: 'هاتف ذكي بمواصفات عالية',
    sku: 'SAM-S23-001'
  },
  { 
    id: 3, 
    name: 'طاولة قهوة خشبية', 
    category: 'أثاث', 
    price: 150.50, 
    costPrice: 100.00, 
    stock: 30, 
    barcode: 'FURN-CT-11223', 
    expiryDate: '2099-12-31', 
    createdAt: '2023-11-10',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop',
    status: 'available',
    description: 'طاولة قهوة أنيقة من الخشب الطبيعي',
    sku: 'FURN-CT-001'
  },
  { 
    id: 4, 
    name: 'سماعات رأس Sony WH-1000XM5', 
    category: 'إلكترونيات', 
    price: 349.00, 
    costPrice: 250.00, 
    stock: 8, 
    barcode: 'SONY-WH-44556', 
    expiryDate: '2027-01-01', 
    createdAt: '2023-09-01',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop',
    status: 'low_stock',
    description: 'سماعات رأس لاسلكية بتقنية إلغاء الضوضاء',
    sku: 'SONY-WH-001'
  },
  { 
    id: 5, 
    name: 'حليب طازج', 
    category: 'مشروبات', 
    price: 5.50, 
    costPrice: 3.50, 
    stock: 0, 
    barcode: 'MILK-FRESH-555', 
    expiryDate: '2024-01-01', 
    createdAt: '2023-12-25',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&h=200&fit=crop',
    status: 'out_of_stock',
    description: 'حليب طازج من مزرعة محلية',
    sku: 'MILK-FRESH-001'
  },
  { 
    id: 6, 
    name: 'كرسي مكتب مريح', 
    category: 'أثاث', 
    price: 299.00, 
    costPrice: 180.00, 
    stock: 25, 
    barcode: 'FURN-OC-77889', 
    expiryDate: '2099-12-31', 
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=300&h=200&fit=crop',
    status: 'available',
    description: 'كرسي مكتب مريح للعمل لساعات طويلة',
    sku: 'FURN-OC-001'
  },
];

interface ProductsPageProps {
  onAddProduct?: () => void;
  onProductClick?: (product: EnhancedProduct) => void;
}

const ProductsPage: React.FC<ProductsPageProps> = ({ onAddProduct, onProductClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Get unique categories and statuses
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(mockProducts.map(p => p.category)));
    return ['all', ...uniqueCategories];
  }, []);

  const statuses = useMemo(() => [
    { value: 'all', label: 'جميع الحالات' },
    { value: 'available', label: 'متوفر' },
    { value: 'low_stock', label: 'مخزون قليل' },
    { value: 'out_of_stock', label: 'نفد المخزون' }
  ], []);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = mockProducts.filter(product => {
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
  }, [searchTerm, selectedCategory, selectedStatus, sortBy, sortOrder]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const lowStockCount = mockProducts.filter(p => p.stock < 10).length;
    const outOfStockCount = mockProducts.filter(p => p.stock === 0).length;
    const totalValue = mockProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const totalCost = mockProducts.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);
    const profitMargin = totalValue > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 0;

    return [
      { id: 1, title: 'إجمالي المنتجات', value: mockProducts.length.toString(), icon: <div className="w-6 h-6 bg-blue-500 rounded"></div>, bgColor: 'bg-blue-100', valueColor: 'text-blue-600' },
      { id: 2, title: 'منتجات قليلة المخزون', value: lowStockCount.toString(), icon: <div className="w-6 h-6 bg-yellow-500 rounded"></div>, bgColor: 'bg-yellow-100', valueColor: 'text-yellow-600' },
      { id: 3, title: 'نفد المخزون', value: outOfStockCount.toString(), icon: <div className="w-6 h-6 bg-red-500 rounded"></div>, bgColor: 'bg-red-100', valueColor: 'text-red-600' },
      { id: 4, title: 'القيمة الإجمالية', value: `${totalValue.toFixed(2)} ر.س`, icon: <div className="w-6 h-6 bg-green-500 rounded"></div>, bgColor: 'bg-green-100', valueColor: 'text-green-600' },
    ];
  }, []);

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
      {/* Product Image */}
      <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
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
            <ViewIcon className="h-4 w-4" />
            عرض
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditProduct(product);
            }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors"
          >
            <EditIcon className="h-4 w-4" />
            تعديل
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteProduct(product);
            }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
          >
            <DeleteIcon className="h-4 w-4" />
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
          <div className="flex-shrink-0 h-12 w-12">
            <img
              className="h-12 w-12 rounded-lg object-cover"
              src={product.image}
              alt={product.name}
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
            <ViewIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEditProduct(product)}
            className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
            title="تعديل"
          >
            <EditIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteProduct(product)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            title="حذف"
          >
            <DeleteIcon className="h-4 w-4" />
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

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <GridViewIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 ${viewMode === 'table' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              title="عرض الجدول"
            >
              <TableViewIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {viewMode === 'grid' ? (
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {filteredAndSortedProducts.length === 0 && (
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
            {filteredAndSortedProducts.length === 0 && (
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

      {/* Results Summary */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        عرض {filteredAndSortedProducts.length} من أصل {mockProducts.length} منتج
      </div>
    </div>
  );
};

export default ProductsPage;
