import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AR_LABELS } from '@/shared/constants';
import ProductListPage from './ProductListPage';
import CategoryManagementPage from './CategoryManagementPage';
import BrandManagementPage from './BrandManagementPage';
import WarehouseManagementPage from './WarehouseManagementPage';
import UnitManagementPage from './UnitManagementPage';
import AddMultiUnitProductPage from './AddMultiUnitProductPage';
import AddNewProductPage from './AddNewProductPage';
import ProductImportPage from './ProductImportPage';
import { productsApi, ProductMetrics } from '@/lib/api/client';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { productsDB } from '@/lib/db/productsDB';
import {
  DollarIcon,
  PackageIcon,
  ChartLineIcon,
  ShoppingCartIcon,
} from '@/shared/assets/icons';

interface ProductDashboardProps {
  setActivePath?: (path: string) => void; // Make optional for backward compatibility
}

const ProductDashboard: React.FC<ProductDashboardProps> = ({ setActivePath }) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [activeView, setActiveView] = useState<'products' | 'categories' | 'brands' | 'warehouses' | 'units' | 'add-product' | 'import'>('products');
  const [productMetrics, setProductMetrics] = useState<ProductMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoadingMetrics(true);
        
        // First, try to load metrics from IndexedDB (fast, instant display)
        try {
          const cachedMetrics = await productsDB.calculateMetrics();
          if (cachedMetrics) {
            // Set cached metrics immediately for instant display
            setProductMetrics(cachedMetrics);
            setLoadingMetrics(false);
            
            // Then fetch from server in the background to get latest data
            const fetchFromServer = async () => {
              try {
                const response = await productsApi.getProductMetrics();
                if (response.data.success && response.data.data) {
                  setProductMetrics(response.data.data);
                }
              } catch (error) {
                console.error('Error fetching product metrics from server:', error);
                // Keep cached metrics if server fetch fails
              }
            };

            // Use requestIdleCallback for better performance, fallback to setTimeout
            if (window.requestIdleCallback) {
              window.requestIdleCallback(fetchFromServer, { timeout: 2000 });
            } else {
              // Fallback: use setTimeout with minimal delay
              setTimeout(fetchFromServer, 0);
            }
            return;
          }
        } catch (error) {
          console.warn('Error calculating metrics from IndexedDB:', error);
          // Continue to fetch from server
        }

        // If no cached data, fetch from server
        const response = await productsApi.getProductMetrics();
        if (response.data.success && response.data.data) {
          setProductMetrics(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching product metrics:', error);
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchMetrics();
  }, []);

  const handleNavigation = (path: string) => {
    if (setActivePath) {
      setActivePath(path);
    } else {
      navigate(path);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add-product':
        setActiveView('add-product');
        break;
      case 'import':
        setActiveView('import');
        break;
      case 'export':
        alert('وظيفة التصدير قيد التطوير');
        break;
      case 'print':
        alert('وظيفة طباعة الباركود قيد التطوير');
        break;
      case 'search':
        setActiveView('products');
        break;
      default:
        break;
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'products':
        return <ProductListPage />;
      case 'categories':
        return <CategoryManagementPage />;
      case 'brands':
        return <BrandManagementPage />;
      case 'warehouses':
        return <WarehouseManagementPage />;
      case 'units':
        return <UnitManagementPage />;
      case 'add-product':
        return <AddNewProductPage />;
      case 'import':
        return <ProductImportPage />;
      default:
        return <ProductListPage />;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Modern Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-orange-50/20 to-amber-100/30 dark:from-slate-950 dark:via-orange-950/20 dark:to-amber-950/30" />
      
      {/* Subtle Floating Orbs */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-red-400/15 to-orange-400/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-slate-400/10 to-orange-400/10 blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Modern Professional Header */}
        <div className="mb-12">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="inline-flex items-center rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 px-4 py-2 text-sm font-semibold text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/50">
                  <div className="mr-2 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                  إدارة المنتجات
                </div>
                <h1 className="bg-gradient-to-r from-slate-900 via-orange-900 to-slate-900 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100 dark:to-white sm:text-5xl lg:text-6xl">
                  لوحة تحكم المنتجات
                </h1>
                <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  إدارة شاملة للمنتجات والفئات والعلامات التجارية
                </p>
              </div>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setActiveView('products')}
                className={`group relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeView === 'products'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/50'
                    : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md'
                }`}
              >
                {activeView === 'products' && (
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur" />
                )}
                <span className="relative">قائمة المنتجات</span>
              </button>
              <button
                onClick={() => setActiveView('import')}
                className={`group relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeView === 'import'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/50'
                    : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md'
                }`}
              >
                {activeView === 'import' && (
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur" />
                )}
                <span className="relative">استيراد المنتجات</span>
              </button>
              <button
                onClick={() => setActiveView('categories')}
                className={`group relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeView === 'categories'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/50'
                    : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md'
                }`}
              >
                {activeView === 'categories' && (
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur" />
                )}
                <span className="relative">إدارة الفئات</span>
              </button>
              <button
                onClick={() => setActiveView('brands')}
                className={`group relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeView === 'brands'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/50'
                    : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md'
                }`}
              >
                {activeView === 'brands' && (
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur" />
                )}
                <span className="relative">إدارة العلامات التجارية</span>
              </button>
              <button
                onClick={() => setActiveView('warehouses')}
                className={`group relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeView === 'warehouses'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/50'
                    : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md'
                }`}
              >
                {activeView === 'warehouses' && (
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur" />
                )}
                <span className="relative">إدارة المستودعات</span>
              </button>
              <button
                onClick={() => setActiveView('units')}
                className={`group relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeView === 'units'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/50'
                    : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md'
                }`}
              >
                {activeView === 'units' && (
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur" />
                )}
                <span className="relative">إدارة الوحدات</span>
              </button>
            </div>
          </div>
        </div>

        {/* Product Metrics Section */}
        {activeView === 'products' && (
          <div className="mb-8">
            {loadingMetrics ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-white/95 p-6 shadow-lg dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-700/50 animate-pulse"
                  >
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : productMetrics ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="group relative">
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 opacity-0 blur transition-all duration-500 group-hover:opacity-100" />
                  <div className="relative overflow-hidden rounded-2xl bg-white/95 p-6 shadow-lg backdrop-blur-xl transition-all duration-500 hover:shadow-xl dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          إجمالي قيمة المنتجات
                        </p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-300 group-hover:scale-105">
                          {formatCurrency(productMetrics.totalValue)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {productMetrics.productsWithStock} منتج بمخزون
                        </p>
                      </div>
                      <div className="relative rounded-xl p-3 bg-emerald-100 dark:bg-emerald-900/30 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                        <DollarIcon />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group relative">
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 opacity-0 blur transition-all duration-500 group-hover:opacity-100" />
                  <div className="relative overflow-hidden rounded-2xl bg-white/95 p-6 shadow-lg backdrop-blur-xl transition-all duration-500 hover:shadow-xl dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          هامش الربح الحقيقي
                        </p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition-all duration-300 group-hover:scale-105">
                          {productMetrics.overallProfitMargin.toFixed(2)}%
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          متوسط: {productMetrics.averageProfitMargin.toFixed(2)}%
                        </p>
                      </div>
                      <div className="relative rounded-xl p-3 bg-blue-100 dark:bg-blue-900/30 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                        <ChartLineIcon />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group relative">
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-red-500/20 to-orange-500/20 opacity-0 blur transition-all duration-500 group-hover:opacity-100" />
                  <div className="relative overflow-hidden rounded-2xl bg-white/95 p-6 shadow-lg backdrop-blur-xl transition-all duration-500 hover:shadow-xl dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          منتجات مخزون منخفض
                        </p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400 transition-all duration-300 group-hover:scale-105">
                          {productMetrics.lowStockCount}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          من {productMetrics.totalProducts} منتج
                        </p>
                      </div>
                      <div className="relative rounded-xl p-3 bg-red-100 dark:bg-red-900/30 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                        <PackageIcon />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group relative">
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 blur transition-all duration-500 group-hover:opacity-100" />
                  <div className="relative overflow-hidden rounded-2xl bg-white/95 p-6 shadow-lg backdrop-blur-xl transition-all duration-500 hover:shadow-xl dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          إجمالي المنتجات
                        </p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 transition-all duration-300 group-hover:scale-105">
                          {productMetrics.totalProducts}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {productMetrics.productsWithStock} بمخزون
                        </p>
                      </div>
                      <div className="relative rounded-xl p-3 bg-purple-100 dark:bg-purple-900/30 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                        <ShoppingCartIcon />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Content */}
        <div className="relative">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ProductDashboard;
