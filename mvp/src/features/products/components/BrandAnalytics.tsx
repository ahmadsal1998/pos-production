import React, { useState, useMemo } from 'react';
import { AR_LABELS } from '../../../shared/constants';
import { Brand } from '../../../shared/types';
import { MetricCard } from '../../../shared/components/ui/MetricCard';

// Mock data for brand analytics
const mockBrands: Brand[] = [
  { 
    id: '1', 
    nameAr: 'كوكا كولا', 
    description: 'علامة تجارية للمشروبات الغازية', 
    status: 'Active', 
    createdAt: '2023-01-15', 
    productCount: 25 
  },
  { 
    id: '2', 
    nameAr: 'سامسونج', 
    description: 'علامة تجارية للإلكترونيات', 
    status: 'Active', 
    createdAt: '2023-02-10', 
    productCount: 150 
  },
  { 
    id: '3', 
    nameAr: 'ليز', 
    description: 'علامة تجارية للمشروبات', 
    status: 'Active', 
    createdAt: '2023-03-05', 
    productCount: 40 
  },
  { 
    id: '4', 
    nameAr: 'المراعي', 
    description: 'علامة تجارية للمنتجات الغذائية', 
    status: 'Inactive', 
    createdAt: '2023-04-01', 
    productCount: 0 
  },
  { 
    id: '5', 
    nameAr: 'سوني', 
    description: 'علامة تجارية للإلكترونيات', 
    status: 'Active', 
    createdAt: '2023-05-15', 
    productCount: 88 
  },
  { 
    id: '6', 
    nameAr: 'أبل', 
    description: 'علامة تجارية للإلكترونيات', 
    status: 'Active', 
    createdAt: '2023-06-01', 
    productCount: 120 
  },
];

interface BrandAnalyticsProps {
  onViewDetails?: (brandId: string) => void;
}

const BrandAnalytics: React.FC<BrandAnalyticsProps> = ({ onViewDetails }) => {
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

    const filteredBrands = mockBrands.filter(b => new Date(b.createdAt) >= startDate);
    
    const totalBrands = filteredBrands.length;
    const activeBrands = filteredBrands.filter(b => b.status === 'Active').length;
    const inactiveBrands = filteredBrands.filter(b => b.status === 'Inactive').length;
    const totalProducts = filteredBrands.reduce((sum, b) => sum + b.productCount, 0);
    
    const brandsWithProducts = filteredBrands.filter(b => b.productCount > 0);
    const emptyBrands = filteredBrands.filter(b => b.productCount === 0);

    return {
      totalBrands,
      activeBrands,
      inactiveBrands,
      totalProducts,
      brandsWithProducts: brandsWithProducts.length,
      emptyBrands: emptyBrands.length,
      topBrands: filteredBrands
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, 3)
        .map(brand => ({ name: brand.nameAr, productCount: brand.productCount }))
    };
  }, [timeFilter]);

  return (
    <div className="space-y-6">
      {/* Key Metrics - Four Most Important */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          id={1}
          title="إجمالي العلامات التجارية"
          value={analytics.totalBrands.toString()}
          icon={<div className="w-6 h-6 bg-blue-500 rounded"></div>}
          bgColor="bg-blue-100"
          valueColor="text-blue-600"
        />
        <MetricCard
          id={2}
          title="العلامات التجارية النشطة"
          value={analytics.activeBrands.toString()}
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
          title="علامات تجارية فارغة"
          value={analytics.emptyBrands.toString()}
          icon={<div className="w-6 h-6 bg-red-500 rounded"></div>}
          bgColor="bg-red-100"
          valueColor="text-red-600"
        />
      </div>

      {/* Top Brands by Product Count */}
      {analytics.topBrands.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">أهم العلامات التجارية حسب عدد المنتجات</h4>
          <div className="space-y-3">
            {analytics.topBrands.map((brand, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-900 dark:text-gray-100 font-medium">{brand.name}</span>
                <span className="text-gray-600 dark:text-gray-400">{brand.productCount} منتج</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {(analytics.emptyBrands > 0 || analytics.inactiveBrands > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">تنبيهات مهمة</h4>
          <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
            {analytics.emptyBrands > 0 && (
              <li>• {analytics.emptyBrands} علامة تجارية فارغة من المنتجات</li>
            )}
            {analytics.inactiveBrands > 0 && (
              <li>• {analytics.inactiveBrands} علامة تجارية غير نشطة</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BrandAnalytics;

