import React, { useMemo } from 'react';
import { MetricCard } from '@/shared/components/ui/MetricCard';
import { Supplier, PurchaseOrder, SupplierPayment } from '../types';

interface SuppliersAnalyticsProps {
  suppliers: Supplier[];
  purchases: PurchaseOrder[];
  payments: SupplierPayment[];
}

const SuppliersAnalytics: React.FC<SuppliersAnalyticsProps> = ({ 
  suppliers, 
  purchases, 
  payments 
}) => {
  const analytics = useMemo(() => {
    // Calculate balance for each supplier
    const supplierBalances = suppliers.map(supplier => {
      const supplierPurchases = purchases.filter(p => p.supplierId === supplier.id);
      const supplierPayments = payments.filter(p => p.supplierId === supplier.id);
      
      const totalPurchases = supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
      const totalPaid = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = totalPurchases + (supplier.previousBalance || 0) - totalPaid;
      
      return { supplier, totalPurchases, totalPaid, balance };
    });

    // Total suppliers
    const totalSuppliers = suppliers.length;
    
    // Active suppliers (with transactions)
    const activeSuppliers = supplierBalances.filter(s => s.totalPurchases > 0).length;
    
    // Suppliers with outstanding balances
    const suppliersWithBalance = supplierBalances.filter(s => s.balance > 0).length;
    
    // Total outstanding balance
    const totalOutstanding = supplierBalances.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);

    return {
      totalSuppliers,
      activeSuppliers,
      suppliersWithBalance,
      totalOutstanding,
    };
  }, [suppliers, purchases, payments]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          id={1}
          title="إجمالي الموردين"
          value={analytics.totalSuppliers.toString()}
          icon={<div className="w-6 h-6 bg-blue-500 rounded"></div>}
          bgColor="bg-blue-100"
          valueColor="text-blue-600"
        />
        <MetricCard
          id={2}
          title="الموردين النشطين"
          value={analytics.activeSuppliers.toString()}
          icon={<div className="w-6 h-6 bg-green-500 rounded"></div>}
          bgColor="bg-green-100"
          valueColor="text-green-600"
        />
        <MetricCard
          id={3}
          title="موردين لديهم رصيد"
          value={analytics.suppliersWithBalance.toString()}
          icon={<div className="w-6 h-6 bg-yellow-500 rounded"></div>}
          bgColor="bg-yellow-100"
          valueColor="text-yellow-600"
        />
        <MetricCard
          id={4}
          title="إجمالي الرصيد المستحق"
          value={`${analytics.totalOutstanding.toFixed(2)} ر.س`}
          icon={<div className="w-6 h-6 bg-red-500 rounded"></div>}
          bgColor="bg-red-100"
          valueColor="text-red-600"
        />
      </div>

      {/* Alert */}
      {analytics.suppliersWithBalance > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">تنبيه مهم</h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            لديك {analytics.suppliersWithBalance} مورد برصيد مستحق يبلغ إجمالي {analytics.totalOutstanding.toFixed(2)} ر.س
          </p>
        </div>
      )}
    </div>
  );
};

export default SuppliersAnalytics;

