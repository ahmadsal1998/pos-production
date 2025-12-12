import React, { useState, useMemo } from 'react';
import { Warehouse } from '@/shared/types';
import { MetricCard } from '@/shared/components/ui/MetricCard';

interface WarehouseAnalyticsProps {
  warehouses: Warehouse[];
  onViewDetails?: (warehouseId: string) => void;
}

const WarehouseAnalytics: React.FC<WarehouseAnalyticsProps> = ({ warehouses }) => {
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

    const filteredWarehouses = warehouses.filter(w => new Date(w.createdAt) >= startDate);
    
    const totalWarehouses = filteredWarehouses.length;
    const activeWarehouses = filteredWarehouses.filter(w => w.status === 'Active').length;
    const inactiveWarehouses = filteredWarehouses.filter(w => w.status === 'Inactive').length;
    const totalProducts = filteredWarehouses.reduce((sum, w) => sum + w.productCount, 0);
    
    const warehousesWithProducts = filteredWarehouses.filter(w => w.productCount > 0);
    const emptyWarehouses = filteredWarehouses.filter(w => w.productCount === 0);

    return {
      totalWarehouses,
      activeWarehouses,
      inactiveWarehouses,
      totalProducts,
      warehousesWithProducts: warehousesWithProducts.length,
      emptyWarehouses: emptyWarehouses.length,
      topWarehouses: filteredWarehouses
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, 3)
        .map(wh => ({ name: wh.nameAr, productCount: wh.productCount }))
    };
  }, [warehouses, timeFilter]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          id={1}
          title="إجمالي المستودعات"
          value={analytics.totalWarehouses.toString()}
          icon={<div className="w-6 h-6 bg-blue-500 rounded"></div>}
          bgColor="bg-blue-100"
          valueColor="text-blue-600"
        />
        <MetricCard
          id={2}
          title="المستودعات النشطة"
          value={analytics.activeWarehouses.toString()}
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
          title="مستودعات فارغة"
          value={analytics.emptyWarehouses.toString()}
          icon={<div className="w-6 h-6 bg-red-500 rounded"></div>}
          bgColor="bg-red-100"
          valueColor="text-red-600"
        />
      </div>

      {/* Top Warehouses by Product Count */}
      {analytics.topWarehouses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">أهم المستودعات حسب عدد المنتجات</h4>
          <div className="space-y-3">
            {analytics.topWarehouses.map((warehouse, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-900 dark:text-gray-100 font-medium">{warehouse.name}</span>
                <span className="text-gray-600 dark:text-gray-400">{warehouse.productCount} منتج</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {(analytics.emptyWarehouses > 0 || analytics.inactiveWarehouses > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">تنبيهات مهمة</h4>
          <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
            {analytics.emptyWarehouses > 0 && (
              <li>• {analytics.emptyWarehouses} مستودع فارغ من المنتجات</li>
            )}
            {analytics.inactiveWarehouses > 0 && (
              <li>• {analytics.inactiveWarehouses} مستودع غير نشط</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default WarehouseAnalytics;

