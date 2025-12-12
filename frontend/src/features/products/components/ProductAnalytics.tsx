import React, { useState, useMemo } from 'react';
import { AR_LABELS } from '../../../shared/constants';
import { Product } from '../../../shared/types';
import { MetricCard } from '../../../shared/components/ui/MetricCard';

// Mock data for analytics
const mockProducts: Product[] = [
  { id: 1, name: 'لابتوب Dell XPS 15', category: 'إلكترونيات', price: 1200.00, costPrice: 950.00, stock: 50, barcode: 'DELL-XPS15-12345', expiryDate: '2025-12-31', createdAt: '2023-01-15' },
  { id: 2, name: 'هاتف Samsung Galaxy S23', category: 'إلكترونيات', price: 899.99, costPrice: 700.00, stock: 120, barcode: 'SAM-S23-67890', expiryDate: '2026-06-30', createdAt: new Date().toISOString() },
  { id: 3, name: 'طاولة قهوة خشبية', category: 'أثاث', price: 150.50, costPrice: 100.00, stock: 30, barcode: 'FURN-CT-11223', expiryDate: '2099-12-31', createdAt: '2023-11-10' },
  { id: 4, name: 'سماعات رأس Sony WH-1000XM5', category: 'إلكترونيات', price: 349.00, costPrice: 250.00, stock: 8, barcode: 'SONY-WH-44556', expiryDate: '2027-01-01', createdAt: '2023-09-01' },
  { id: 5, name: 'حليب طازج', category: 'مشروبات', price: 5.50, costPrice: 3.50, stock: 20, barcode: 'MILK-FRESH-555', expiryDate: '2024-01-01', createdAt: '2023-12-25' },
  { id: 6, name: 'كرسي مكتب مريح', category: 'أثاث', price: 299.00, costPrice: 180.00, stock: 25, barcode: 'FURN-OC-77889', expiryDate: '2099-12-31', createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
];

interface ProductAnalyticsProps {
  onViewDetails?: (productId: number) => void;
}

const ProductAnalytics: React.FC<ProductAnalyticsProps> = ({ onViewDetails }) => {
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

    const filteredProducts = mockProducts.filter(p => new Date(p.createdAt) >= startDate);
    
    const totalValue = filteredProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const totalCost = filteredProducts.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);
    const profitMargin = totalValue > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 0;
    
    const lowStockProducts = filteredProducts.filter(p => p.stock < 10);
    const expiredProducts = filteredProducts.filter(p => new Date(p.expiryDate) < now);
    
    const categoryStats = filteredProducts.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalProducts: filteredProducts.length,
      totalValue: totalValue,
      totalCost: totalCost,
      profitMargin: profitMargin,
      lowStockCount: lowStockProducts.length,
      expiredCount: expiredProducts.length,
      categoryStats: categoryStats,
      topCategories: Object.entries(categoryStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category, count]) => ({ category, count }))
    };
  }, [timeFilter]);

  return (
    <div className="space-y-6">
      {/* Time Filter */}


  
      {/* Top Categories */}


      {/* Alerts */}
      {(analytics.lowStockCount > 0 || analytics.expiredCount > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">تنبيهات مهمة</h4>
          <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
            {analytics.lowStockCount > 0 && (
              <li>• {analytics.lowStockCount} منتج يحتاج إعادة تموين</li>
            )}
            {analytics.expiredCount > 0 && (
              <li>• {analytics.expiredCount} منتج منتهي الصلاحية</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProductAnalytics;
