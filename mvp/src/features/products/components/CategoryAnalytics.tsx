import React, { useState, useMemo } from 'react';
import { AR_LABELS } from '../../../shared/constants';
import { Category } from '../../../shared/types';
import { MetricCard } from '../../../shared/components/ui/MetricCard';

// Mock data for category analytics
const mockCategories: Category[] = [
  { 
    id: '1', 
    nameAr: 'إلكترونيات', 
    description: 'جميع الأجهزة الإلكترونية', 
    parentId: null, 
    status: 'Active', 
    createdAt: '2023-01-15', 
    productCount: 150 
  },
  { 
    id: '2', 
    nameAr: 'مشروبات', 
    description: 'المشروبات والعصائر', 
    parentId: null, 
    status: 'Active', 
    createdAt: '2023-02-10', 
    productCount: 75 
  },
  { 
    id: '3', 
    nameAr: 'أثاث', 
    description: 'الأثاث المنزلي والمكتبي', 
    parentId: null, 
    status: 'Active', 
    createdAt: '2023-03-05', 
    productCount: 45 
  },
  { 
    id: '4', 
    nameAr: 'هواتف ذكية', 
    description: 'الهواتف الذكية والأجهزة المحمولة', 
    parentId: '1', 
    status: 'Active', 
    createdAt: '2023-04-01', 
    productCount: 60 
  },
  { 
    id: '5', 
    nameAr: 'لابتوبات', 
    description: 'أجهزة الكمبيوتر المحمولة', 
    parentId: '1', 
    status: 'Active', 
    createdAt: '2023-04-15', 
    productCount: 30 
  },
  { 
    id: '6', 
    nameAr: 'مشروبات غازية', 
    description: 'المشروبات الغازية والعصائر', 
    parentId: '2', 
    status: 'Active', 
    createdAt: '2023-05-01', 
    productCount: 25 
  },
  { 
    id: '7', 
    nameAr: 'أثاث مكتبي', 
    description: 'أثاث المكاتب والمكاتب المنزلية', 
    parentId: '3', 
    status: 'Inactive', 
    createdAt: '2023-06-01', 
    productCount: 0 
  },
];

interface CategoryAnalyticsProps {
  onViewDetails?: (categoryId: string) => void;
}

const CategoryAnalytics: React.FC<CategoryAnalyticsProps> = ({ onViewDetails }) => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'year'>('month');

  const analytics = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    switch (timeFilter) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filteredCategories = mockCategories.filter(c => new Date(c.createdAt) >= startDate);
    
    const totalCategories = filteredCategories.length;
    const activeCategories = filteredCategories.filter(c => c.status === 'Active').length;
    const inactiveCategories = filteredCategories.filter(c => c.status === 'Inactive').length;
    const totalProducts = filteredCategories.reduce((sum, c) => sum + c.productCount, 0);
    
    const parentCategories = filteredCategories.filter(c => c.parentId === null);
    const subCategories = filteredCategories.filter(c => c.parentId !== null);
    
    const categoriesWithProducts = filteredCategories.filter(c => c.productCount > 0);
    const emptyCategories = filteredCategories.filter(c => c.productCount === 0);

    return {
      totalCategories,
      activeCategories,
      inactiveCategories,
      totalProducts,
      parentCategories: parentCategories.length,
      subCategories: subCategories.length,
      categoriesWithProducts: categoriesWithProducts.length,
      emptyCategories: emptyCategories.length,
      topCategories: filteredCategories
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, 3)
        .map(cat => ({ name: cat.nameAr, productCount: cat.productCount }))
    };
  }, [timeFilter]);

  return (
    <div className="space-y-6">
      {/* Key Metrics - Four Most Important */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          id={1}
          title="إجمالي الفئات"
          value={analytics.totalCategories.toString()}
          icon={<div className="w-6 h-6 bg-blue-500 rounded"></div>}
          bgColor="bg-blue-100"
          valueColor="text-blue-600"
        />
        <MetricCard
          id={2}
          title="الفئات النشطة"
          value={analytics.activeCategories.toString()}
          icon={<div className="w-6 h-6 bg-green-500 rounded"></div>}
          bgColor="bg-green-100"
          valueColor="text-green-600"
        />
        <MetricCard
          id={3}
          title="إجمالي المنتجات"
          value={analytics.totalProducts.toString()}
          icon={<div className="w-6 h-6 bg-purple-500 rounded"></div>}
          bgColor="bg-purple-100"
          valueColor="text-purple-600"
        />
        <MetricCard
          id={4}
          title="فئات فارغة"
          value={analytics.emptyCategories.toString()}
          icon={<div className="w-6 h-6 bg-red-500 rounded"></div>}
          bgColor="bg-red-100"
          valueColor="text-red-600"
        />
      </div>

      {/* Top Categories by Product Count */}
      {analytics.topCategories.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">أهم الفئات حسب عدد المنتجات</h4>
          <div className="space-y-3">
            {analytics.topCategories.map((category, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-900 dark:text-gray-100 font-medium">{category.name}</span>
                <span className="text-gray-600 dark:text-gray-400">{category.productCount} منتج</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {(analytics.emptyCategories > 0 || analytics.inactiveCategories > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">تنبيهات مهمة</h4>
          <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
            {analytics.emptyCategories > 0 && (
              <li>• {analytics.emptyCategories} فئة فارغة من المنتجات</li>
            )}
            {analytics.inactiveCategories > 0 && (
              <li>• {analytics.inactiveCategories} فئة غير نشطة</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CategoryAnalytics;
