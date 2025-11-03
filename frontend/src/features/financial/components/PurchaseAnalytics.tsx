import React, { useState, useMemo } from 'react';
import { AR_LABELS } from '@/shared/constants';
import { MetricCard } from '@/shared/components/ui/MetricCard';
import { PurchaseOrder } from '../types';

interface PurchaseAnalyticsProps {
  purchases?: PurchaseOrder[];
  onViewDetails?: (purchaseId: string) => void;
}

const PurchaseAnalytics: React.FC<PurchaseAnalyticsProps> = ({ purchases = [], onViewDetails }) => {
  const analytics = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeek = new Date(now.setDate(now.getDate() - 7));
    
    const monthPurchases = purchases.filter(p => new Date(p.purchaseDate) >= thisMonth);
    const weekPurchases = purchases.filter(p => new Date(p.purchaseDate) >= thisWeek);
    
    const totalPurchases = purchases.length;
    const pendingPurchases = purchases.filter(p => p.status === 'Pending').length;
    const completedPurchases = purchases.filter(p => p.status === 'Completed').length;
    const cancelledPurchases = purchases.filter(p => p.status === 'Cancelled').length;
    
    const totalAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const monthAmount = monthPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const weekAmount = weekPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

    return {
      totalPurchases,
      pendingPurchases,
      completedPurchases,
      cancelledPurchases,
      totalAmount,
      monthAmount,
      weekAmount,
    };
  }, [purchases]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          id={1}
          title="إجمالي المشتريات"
          value={analytics.totalPurchases.toString()}
          icon={<div className="w-6 h-6 bg-blue-500 rounded"></div>}
          bgColor="bg-blue-100"
          valueColor="text-blue-600"
        />
        <MetricCard
          id={2}
          title="إجمالي المبلغ"
          value={`${analytics.totalAmount.toFixed(2)} ر.س`}
          icon={<div className="w-6 h-6 bg-green-500 rounded"></div>}
          bgColor="bg-green-100"
          valueColor="text-green-600"
        />
        <MetricCard
          id={3}
          title="مشتريات معلقة"
          value={analytics.pendingPurchases.toString()}
          icon={<div className="w-6 h-6 bg-yellow-500 rounded"></div>}
          bgColor="bg-yellow-100"
          valueColor="text-yellow-600"
        />
        <MetricCard
          id={4}
          title="مكتملة"
          value={analytics.completedPurchases.toString()}
          icon={<div className="w-6 h-6 bg-purple-500 rounded"></div>}
          bgColor="bg-purple-100"
          valueColor="text-purple-600"
        />
      </div>

      {/* Alerts */}
      {(analytics.pendingPurchases > 0 || analytics.cancelledPurchases > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">تنبيهات مهمة</h4>
          <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
            {analytics.pendingPurchases > 0 && (
              <li>• {analytics.pendingPurchases} طلب شراء معلق يحتاج متابعة</li>
            )}
            {analytics.cancelledPurchases > 0 && (
              <li>• {analytics.cancelledPurchases} طلب شراء ملغي</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PurchaseAnalytics;

