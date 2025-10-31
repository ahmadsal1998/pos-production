import React, { useMemo } from 'react';
import { MetricCard } from '@/shared/components/ui/MetricCard';
import { SupplierPayment } from '../types';

interface PaymentsAnalyticsProps {
  payments: SupplierPayment[];
}

const PaymentsAnalytics: React.FC<PaymentsAnalyticsProps> = ({ payments }) => {
  const analytics = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeek = new Date(now.setDate(now.getDate() - 7));
    
    const monthPayments = payments.filter(p => new Date(p.date) >= thisMonth);
    const weekPayments = payments.filter(p => new Date(p.date) >= thisWeek);
    
    const totalPayments = payments.length;
    const cashPayments = payments.filter(p => p.method === 'Cash').length;
    const bankPayments = payments.filter(p => p.method === 'Bank Transfer').length;
    const chequePayments = payments.filter(p => p.method === 'Cheque').length;
    
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const monthAmount = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    const weekAmount = weekPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalPayments,
      cashPayments,
      bankPayments,
      chequePayments,
      totalAmount,
      monthAmount,
      weekAmount,
    };
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          id={1}
          title="إجمالي المدفوعات"
          value={analytics.totalPayments.toString()}
          icon={<div className="w-6 h-6 bg-blue-500 rounded"></div>}
          bgColor="bg-blue-100"
          valueColor="text-blue-600"
        />
        <MetricCard
          id={2}
          title="إجمالي المبلغ المدفوع"
          value={`${analytics.totalAmount.toFixed(2)} ر.س`}
          icon={<div className="w-6 h-6 bg-green-500 rounded"></div>}
          bgColor="bg-green-100"
          valueColor="text-green-600"
        />
        <MetricCard
          id={3}
          title="مدفوعات نقدية"
          value={analytics.cashPayments.toString()}
          icon={<div className="w-6 h-6 bg-purple-500 rounded"></div>}
          bgColor="bg-purple-100"
          valueColor="text-purple-600"
        />
        <MetricCard
          id={4}
          title="تحويلات بنكية"
          value={analytics.bankPayments.toString()}
          icon={<div className="w-6 h-6 bg-indigo-500 rounded"></div>}
          bgColor="bg-indigo-100"
          valueColor="text-indigo-600"
        />
      </div>

      {/* Summary Info */}
      {analytics.totalPayments > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">ملخص المدفوعات هذا الشهر</h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            إجمالي المدفوعات هذا الشهر: {analytics.monthAmount.toFixed(2)} ر.س | هذا الأسبوع: {analytics.weekAmount.toFixed(2)} ر.س
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentsAnalytics;

