import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AR_LABELS } from '@/shared/constants';
import ProductListPage from './ProductListPage';
import CategoryManagementPage from './CategoryManagementPage';
import BrandManagementPage from './BrandManagementPage';
import AddMultiUnitProductPage from './AddMultiUnitProductPage';

interface ProductDashboardProps {
  setActivePath?: (path: string) => void; // Make optional for backward compatibility
}

const ProductDashboard: React.FC<ProductDashboardProps> = ({ setActivePath }) => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'products' | 'categories' | 'brands' | 'add-product'>('products');

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
        alert('وظيفة الاستيراد قيد التطوير');
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
      case 'add-product':
        return <AddMultiUnitProductPage />;
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
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ProductDashboard;
