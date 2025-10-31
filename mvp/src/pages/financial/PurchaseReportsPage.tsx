import React, { useState, useMemo } from 'react';
import { PurchaseOrder, Supplier, SupplierPayment } from '@/features/financial/types';
import { AR_LABELS, SearchIcon } from '@/shared/constants';
import { MetricCard } from '@/shared/components/ui/MetricCard';

interface PurchaseReportsPageProps {
  purchases?: PurchaseOrder[];
  payments?: SupplierPayment[];
  suppliers?: Supplier[];
}

const PurchaseReportsPage: React.FC<PurchaseReportsPageProps> = ({ 
  purchases = [], 
  payments = [],
  suppliers = []
}) => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');

  const analytics = useMemo(() => {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);

    let filteredPurchases = purchases.filter(p => {
      const purchaseDate = new Date(p.purchaseDate);
      const matchesDate = purchaseDate >= startDate && purchaseDate <= endDate;
      const matchesSupplier = selectedSupplierId === 'all' || p.supplierId === selectedSupplierId;
      return matchesDate && matchesSupplier;
    });

    const totalPurchases = filteredPurchases.length;
    const totalAmount = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const paidPurchases = filteredPurchases.filter(p => p.status === 'Completed').length;
    const pendingPurchases = filteredPurchases.filter(p => p.status === 'Pending').length;

    // Calculate outstanding balances
    const supplierBalances = suppliers.map(supplier => {
      const supplierPurchases = filteredPurchases.filter(p => p.supplierId === supplier.id);
      const supplierPayments = payments.filter(p => 
        p.supplierId === supplier.id && 
        new Date(p.date) >= startDate && 
        new Date(p.date) <= endDate
      );
      
      const totalPurchases = supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
      const totalPaid = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = totalPurchases - totalPaid + (supplier.previousBalance || 0);
      
      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        totalPurchases,
        totalPaid,
        balance,
        transactionCount: supplierPurchases.length,
      };
    }).filter(s => s.transactionCount > 0);

    // Top suppliers by transaction volume
    const topSuppliers = [...supplierBalances]
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
      .slice(0, 5);

    // Outstanding balances
    const outstandingBalances = supplierBalances
      .filter(s => s.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    return {
      totalPurchases,
      totalAmount,
      paidPurchases,
      pendingPurchases,
      topSuppliers,
      outstandingBalances,
    };
  }, [purchases, payments, suppliers, dateRange, selectedSupplierId]);

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المورد</label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"
            >
              <option value="all">جميع الموردين</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
          title="مشتراة مكتملة"
          value={analytics.paidPurchases.toString()}
          icon={<div className="w-6 h-6 bg-purple-500 rounded"></div>}
          bgColor="bg-purple-100"
          valueColor="text-purple-600"
        />
        <MetricCard
          id={4}
          title="معلقة"
          value={analytics.pendingPurchases.toString()}
          icon={<div className="w-6 h-6 bg-yellow-500 rounded"></div>}
          bgColor="bg-yellow-100"
          valueColor="text-yellow-600"
        />
      </div>

      {/* Top Suppliers */}
      {analytics.topSuppliers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">أهم الموردين حسب حجم المعاملات</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">المورد</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">عدد المعاملات</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-left">إجمالي المشتريات</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-left">المدفوع</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-left">الرصيد</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.topSuppliers.map((supplier) => (
                  <tr key={supplier.supplierId}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{supplier.supplierName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">{supplier.transactionCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-left">{supplier.totalPurchases.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 text-left">{supplier.totalPaid.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-sm font-semibold text-left ${supplier.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {supplier.balance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Outstanding Balances */}
      {analytics.outstandingBalances.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">الأرصدة المستحقة</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">المورد</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-left">الرصيد المستحق</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.outstandingBalances.map((supplier) => (
                  <tr key={supplier.supplierId}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{supplier.supplierName}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 text-left">
                      {supplier.balance.toFixed(2)} ر.س
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseReportsPage;

