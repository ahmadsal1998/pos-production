import React, { useState, useMemo } from 'react';
import { AR_LABELS, PrintIcon, ViewIcon } from '@/shared/constants';
import { SaleTransaction } from '@/shared/types';

// Mock data for historical sales
// FIX: Corrected mock data to match the SaleTransaction interface and use valid enum values.
const mockHistoricalSales: SaleTransaction[] = [
  // Today
  { id: 'ORD-240721-001', date: new Date(new Date().setHours(9, 15, 0)).toISOString(), customerId: 'CUST-001', customerName: 'علي محمد', totalAmount: 150.75, paidAmount: 150.75, remainingAmount: 0, paymentMethod: 'Card', status: 'Paid', seller: 'أحمد صالح', items: [], subtotal: 131.09, totalItemDiscount: 0, invoiceDiscount: 0, tax: 19.66 },
  { id: 'ORD-240721-002', date: new Date(new Date().setHours(10, 30, 0)).toISOString(), customerId: 'CUST-002', customerName: 'فاطمة الزهراء', totalAmount: 85.00, paidAmount: 85.00, remainingAmount: 0, paymentMethod: 'Cash', status: 'Paid', seller: 'أحمد صالح', items: [], subtotal: 73.91, totalItemDiscount: 0, invoiceDiscount: 0, tax: 11.09 },
  // Yesterday
  { id: 'ORD-240720-001', date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), customerId: 'CUST-005', customerName: 'أحمد حسن', totalAmount: 300.00, paidAmount: 300.00, remainingAmount: 0, paymentMethod: 'Card', status: 'Paid', seller: 'أحمد صالح', items: [], subtotal: 260.87, totalItemDiscount: 0, invoiceDiscount: 0, tax: 39.13 },
  { id: 'ORD-240720-002', date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), customerId: 'CUST-006', customerName: 'ليلى خالد', totalAmount: 55.50, paidAmount: 0, remainingAmount: 55.50, paymentMethod: 'Cash', status: 'Due', seller: 'أحمد صالح', items: [], subtotal: 48.26, totalItemDiscount: 0, invoiceDiscount: 0, tax: 7.24 },
  // Last Week
  { id: 'ORD-240715-001', date: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString(), customerId: 'CUST-007', customerName: 'يوسف محمود', totalAmount: 450.25, paidAmount: 400, remainingAmount: 50.25, paymentMethod: 'Card', status: 'Partial', seller: 'أحمد صالح', items: [], subtotal: 391.52, totalItemDiscount: 0, invoiceDiscount: 0, tax: 58.73 },
];

const SalesHistoryPage: React.FC = () => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const filteredSales = useMemo(() => {
    return mockHistoricalSales.filter(sale => {
      const saleDate = new Date(sale.date);
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;

      if (startDate && saleDate < startDate) {
        return false;
      }
      if (endDate) {
        // Include the entire end day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (saleDate > endOfDay) {
          return false;
        }
      }
      return true;
    });
  }, [filters]);
  
  const resetFilters = () => {
    setFilters({ startDate: '', endDate: '' });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.salesHistory}</h1>
        <p className="text-gray-600 dark:text-gray-400">{AR_LABELS.salesHistoryDescription}</p>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right mb-1">{AR_LABELS.from}</label>
            <input type="date" name="startDate" id="startDate" value={filters.startDate} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-700 text-right"/>
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right mb-1">{AR_LABELS.to}</label>
            <input type="date" name="endDate" id="endDate" value={filters.endDate} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-700 text-right"/>
          </div>
          <div className="flex space-x-2 space-x-reverse">
             <button onClick={resetFilters} className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
              {AR_LABELS.resetFilters}
            </button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.orderId}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.date}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.customerName}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.totalAmount}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.paymentMethod}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.status}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">{AR_LABELS.actions}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSales.length > 0 ? filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{sale.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{new Date(sale.date).toLocaleDateString('ar-EG')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{sale.customerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{sale.totalAmount.toFixed(2)} ر.س</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{sale.paymentMethod}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* FIX: Replaced invalid status check for 'Pending' with 'Partial' to align with SaleStatus type. */}
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
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">{AR_LABELS.noSalesFound}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesHistoryPage;