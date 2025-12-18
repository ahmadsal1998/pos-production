import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AR_LABELS, PrintIcon, ViewIcon } from '@/shared/constants';
import { SaleTransaction, SaleStatus, SalePaymentMethod } from '@/shared/types';
import { formatDate } from '@/shared/utils';
import { salesApi, ApiError } from '@/lib/api/client';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { useAuthStore } from '@/app/store';
import { getBusinessDateFilterRange, getBusinessDayStartTime } from '@/shared/utils/businessDate';

const SalesHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { user } = useAuthStore();
  const currentUserName = user?.fullName || user?.username || 'Unknown';
  const [historicalSales, setHistoricalSales] = useState<SaleTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
  });

  // Fetch sales from database
  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await salesApi.getSales();
      const backendResponse = response.data as any;
      
      if (backendResponse?.success && Array.isArray(backendResponse.data?.sales)) {
        // Transform API sales to SaleTransaction format
        const apiSales: SaleTransaction[] = backendResponse.data.sales.map((sale: any) => ({
          id: sale.id || sale._id || sale.invoiceNumber,
          invoiceNumber: sale.invoiceNumber || sale.id || sale._id,
          date: sale.date || sale.createdAt || new Date().toISOString(),
          customerName: sale.customerName || 'عميل نقدي',
          customerId: sale.customerId || 'walk-in-customer',
          totalAmount: sale.total || sale.totalAmount || 0,
          paidAmount: sale.paidAmount || 0,
          remainingAmount: sale.remainingAmount || (sale.total - (sale.paidAmount || 0)),
          paymentMethod: (sale.paymentMethod?.charAt(0).toUpperCase() + sale.paymentMethod?.slice(1).toLowerCase()) as SalePaymentMethod || 'Cash',
          status: sale.status === 'completed' ? 'Paid' : sale.status === 'partial_payment' ? 'Partial' : sale.status === 'pending' ? 'Due' : sale.status === 'refunded' || sale.status === 'partial_refund' ? 'Returned' : (sale.status as SaleStatus) || 'Paid',
          seller: sale.seller || sale.cashier || currentUserName,
          items: Array.isArray(sale.items) ? sale.items.map((item: any) => ({
            productId: typeof item.productId === 'string' ? parseInt(item.productId) || 0 : item.productId || 0,
            name: item.productName || item.name || '',
            unit: item.unit || 'قطعة',
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            total: item.totalPrice || item.total || 0,
            discount: item.discount || 0,
            conversionFactor: item.conversionFactor,
          })) : [],
          subtotal: sale.subtotal || 0,
          totalItemDiscount: sale.totalItemDiscount || 0,
          invoiceDiscount: sale.invoiceDiscount || sale.discount || 0,
          tax: sale.tax || 0,
        }));
        
        // Sort by date (most recent first)
        apiSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setHistoricalSales(apiSales);
        console.log(`Loaded ${apiSales.length} sales from database`);
      } else {
        setHistoricalSales([]);
        console.log('No sales found in database');
      }
    } catch (error: any) {
      const apiError = error as ApiError;
      console.error('Error fetching sales:', apiError);
      if (apiError.status === 401 || apiError.status === 403) {
        navigate('/login', { replace: true });
        return;
      }
      setError(apiError.message || 'فشل تحميل المبيعات');
      setHistoricalSales([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Fetch sales on mount
  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const filteredSales = useMemo(() => {
    // Use business date filtering
    const businessDayStartTime = getBusinessDayStartTime();
    const timeStr = businessDayStartTime.hours.toString().padStart(2, '0') + ':' + businessDayStartTime.minutes.toString().padStart(2, '0');
    const { start, end } = getBusinessDateFilterRange(
      filters.startDate || null,
      filters.endDate || null,
      timeStr
    );
    
    return historicalSales.filter(sale => {
      const saleDate = new Date(sale.date);
      if (start && saleDate < start) return false;
      if (end && saleDate > end) return false;
      return true;
    });
  }, [historicalSales, filters]);
  
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

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
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">جاري تحميل المبيعات...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSales.length > 0 ? filteredSales.map((sale) => {
                const isReturn = sale.status === 'Returned' || sale.id.startsWith('RET-');
                const displayTotal = isReturn ? Math.abs(sale.totalAmount) : sale.totalAmount;
                return (
                <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{sale.invoiceNumber || sale.id}</span>
                   
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDate(sale.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{sale.customerName}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${isReturn ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
                    {isReturn ? '-' : ''}{formatCurrency(displayTotal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{sale.paymentMethod}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* FIX: Replaced invalid status check for 'Pending' with 'Partial' to align with SaleStatus type. */}
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      sale.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                      sale.status === 'Partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                      sale.status === 'Returned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                      'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                    }`}>
                      {sale.status === 'Returned' ? (AR_LABELS.returnProduct || 'إرجاع') : sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 ml-4 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={AR_LABELS.viewDetails}><ViewIcon /></button>
                    <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={AR_LABELS.printReceipt}><PrintIcon /></button>
                  </td>
                </tr>
                );
              }) : (
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