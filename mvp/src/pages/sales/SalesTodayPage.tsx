import React from 'react';
import { AR_LABELS, PrintIcon, ViewIcon } from '@/shared/constants';
import { MetricCardProps, SaleTransaction } from '@/shared/types';
import { MetricCard } from '@/shared/components/ui/MetricCard';

// Icons for metrics
const TotalSalesIcon = () => <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.592 1M12 8V7m0 11v1m-6-11h1m10 0h1M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;
const OrdersIcon = () => <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>;
const AvgValueIcon = () => <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;


// Mock data for today's sales
const today = new Date();
// FIX: Corrected mock data to match SaleTransaction interface and use valid enum values.
const mockTodaysSales: SaleTransaction[] = [
  { id: 'ORD-240721-001', customerId: 'CUST-001', date: new Date(new Date().setHours(9, 15, 0)).toISOString(), customerName: 'علي محمد', totalAmount: 150.75, paidAmount: 150.75, remainingAmount: 0, paymentMethod: 'Card', status: 'Paid', seller: 'أحمد صالح', items: [], subtotal: 131.09, totalItemDiscount: 0, invoiceDiscount: 0, tax: 19.66 },
  { id: 'ORD-240721-002', customerId: 'CUST-002', date: new Date(new Date().setHours(10, 30, 0)).toISOString(), customerName: 'فاطمة الزهراء', totalAmount: 85.00, paidAmount: 85.00, remainingAmount: 0, paymentMethod: 'Cash', status: 'Paid', seller: 'أحمد صالح', items: [], subtotal: 73.91, totalItemDiscount: 0, invoiceDiscount: 0, tax: 11.09 },
  { id: 'ORD-240721-003', customerId: 'CUST-003', date: new Date(new Date().setHours(11, 5, 0)).toISOString(), customerName: 'خالد عبدالله', totalAmount: 220.50, paidAmount: 220.50, remainingAmount: 0, paymentMethod: 'Card', status: 'Paid', seller: 'أحمد صالح', items: [], subtotal: 191.74, totalItemDiscount: 0, invoiceDiscount: 0, tax: 28.76 },
  { id: 'ORD-240721-004', customerId: 'CUST-004', date: new Date(new Date().setHours(12, 45, 0)).toISOString(), customerName: 'سارة إبراهيم', totalAmount: 45.25, paidAmount: 0, remainingAmount: 45.25, paymentMethod: 'Card', status: 'Due', seller: 'أحمد صالح', items: [], subtotal: 39.35, totalItemDiscount: 0, invoiceDiscount: 0, tax: 5.90 },
];

const SalesTodayPage: React.FC = () => {
  const totalSales = mockTodaysSales.reduce((sum, sale) => sum + (sale.status === 'Paid' ? sale.totalAmount : 0), 0);
  const totalOrders = mockTodaysSales.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  const salesMetrics: MetricCardProps[] = [
    { id: 1, title: AR_LABELS.totalSales, value: `${totalSales.toFixed(2)} ر.س`, icon: <TotalSalesIcon />, bgColor: 'bg-green-100', valueColor: 'text-green-600' },
    { id: 2, title: AR_LABELS.numberOfOrders, value: `${totalOrders}`, icon: <OrdersIcon />, bgColor: 'bg-blue-100', valueColor: 'text-blue-600' },
    { id: 3, title: AR_LABELS.avgOrderValue, value: `${avgOrderValue.toFixed(2)} ر.س`, icon: <AvgValueIcon />, bgColor: 'bg-orange-100', valueColor: 'text-orange-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.salesToday}</h1>
        <p className="text-gray-600 dark:text-gray-400">{AR_LABELS.salesTodayDescription}</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {salesMetrics.map(metric => (
          <MetricCard key={metric.id} {...metric} />
        ))}
      </div>

      {/* Sales Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.orderId}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.time}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.customerName}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.totalAmount}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.paymentMethod}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.status}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">{AR_LABELS.actions}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {mockTodaysSales.length > 0 ? mockTodaysSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{sale.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{new Date(sale.date).toLocaleTimeString('ar-EG')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{sale.customerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{sale.totalAmount.toFixed(2)} ر.س</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{sale.paymentMethod}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* FIX: Replaced invalid 'Pending' status check with 'Partial' to match the SaleStatus type. */}
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      sale.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                      sale.status === 'Partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 ml-4 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={AR_LABELS.viewDetails}><ViewIcon /></button>
                    <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={AR_LABELS.printReceipt}><PrintIcon /></button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">{AR_LABELS.noSalesToday}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesTodayPage;