import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { pointsApi, customersApi } from '@/lib/api/client';
import { AR_LABELS, SearchIcon } from '@/shared/constants';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { useAuthStore } from '@/app/store';
import { Customer } from '@/shared/types';

interface PointsTransaction {
  id: string;
  globalCustomerId: string;
  earningStoreId?: string;
  redeemingStoreId?: string;
  transactionType: 'earned' | 'spent' | 'expired' | 'adjusted';
  points: number;
  pointsValue?: number;
  invoiceNumber?: string;
  description?: string;
  createdAt: string;
}

interface PointsBalance {
  id: string;
  globalCustomerId: string;
  customerName: string;
  totalPoints: number;
  availablePoints: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastTransactionDate?: string;
}

const PointsHistoryPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Customer selection state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  const [allTransactions, setAllTransactions] = useState<PointsTransaction[]>([]);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'earned' | 'spent' | 'expired' | 'adjusted'>('all');
  const limit = 20;

  // Check URL parameters for customer ID or phone
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    const phone = searchParams.get('phone');
    
    if (customerId || phone) {
      // Load customer data if provided in URL
      loadCustomerByIdentifier(customerId || undefined, phone || undefined);
    }
  }, [searchParams]);

  // Load customers for search
  const loadCustomers = async (search: string) => {
    if (!search || search.trim().length < 2) {
      setCustomers([]);
      return;
    }

    setLoadingCustomers(true);
    try {
      const response = await customersApi.getCustomers({ search: search.trim() });
      if (response.data.success && response.data.data.customers) {
        setCustomers(response.data.data.customers.slice(0, 10)); // Limit to 10 results
      }
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Load customer by ID or phone
  const loadCustomerByIdentifier = async (customerId?: string, phone?: string) => {
    if (!customerId && !phone) return;

    setLoading(true);
    setError(null);
    
    try {
      // If we have customerId, try to get customer details first
      if (customerId && customerId.trim()) {
        try {
          const customerResponse = await customersApi.getCustomer(customerId.trim());
          if (customerResponse.data.success && customerResponse.data.data.customer) {
            const customer = customerResponse.data.data.customer;
            setSelectedCustomer({
              id: customer.id,
              name: customer.name,
              phone: customer.phone || '',
              address: customer.address,
              previousBalance: customer.previousBalance || 0,
            });
            // Use phone from customer data (even if empty, still pass customerId)
            loadPointsDataForCustomer(customer.phone || undefined, customer.id);
            setLoading(false);
            return;
          }
        } catch (err: any) {
          console.error('Failed to load customer by ID:', err);
          // If customer lookup fails, try with phone if available
          if (phone && phone.trim()) {
            // Create a minimal customer object from phone
            setSelectedCustomer({
              id: customerId,
              name: phone,
              phone: phone.trim(),
              address: '',
              previousBalance: 0,
            });
            loadPointsDataForCustomer(phone.trim(), customerId);
            setLoading(false);
            return;
          }
        }
      }

      // Fallback to phone if customerId lookup failed or phone provided directly
      if (phone && phone.trim()) {
        // If we have phone but no customer object, create minimal one
        if (!selectedCustomer) {
          setSelectedCustomer({
            id: customerId || '',
            name: phone,
            phone: phone.trim(),
            address: '',
            previousBalance: 0,
          });
        }
        loadPointsDataForCustomer(phone.trim(), customerId);
        setLoading(false);
        return;
      }

      // If we only have customerId but no customer found and no phone, show error
      if (customerId && !phone) {
        setError('لم يتم العثور على بيانات العميل');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error loading customer:', err);
      setError(err?.response?.data?.message || 'فشل تحميل بيانات العميل');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce customer search
    const timer = setTimeout(() => {
      if (customerSearchTerm.trim().length >= 2) {
        loadCustomers(customerSearchTerm);
      } else {
        setCustomers([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearchTerm]);

  // Apply filters and search to transactions
  useEffect(() => {
    let filtered = [...allTransactions];
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.transactionType === filterType);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.description?.toLowerCase().includes(searchLower) ||
        t.invoiceNumber?.toLowerCase().includes(searchLower) ||
        t.earningStoreId?.toLowerCase().includes(searchLower) ||
        t.redeemingStoreId?.toLowerCase().includes(searchLower)
      );
    }
    
    setTransactions(filtered);
  }, [allTransactions, filterType, searchTerm]);

  useEffect(() => {
    if (selectedCustomer) {
      loadPointsDataForCustomer(selectedCustomer.phone, selectedCustomer.id);
    }
  }, [page, selectedCustomer]);

  const loadPointsDataForCustomer = async (phone?: string, customerId?: string) => {
    if (!phone && !customerId) {
      setError('يرجى تحديد عميل لعرض تاريخ النقاط');
      setBalance(null);
      setAllTransactions([]);
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare parameters - only include non-empty values
      const params: any = {};
      if (customerId && customerId.trim()) params.customerId = customerId.trim();
      if (phone && phone.trim()) params.phone = phone.trim();

      // At least one parameter must be present
      if (!params.customerId && !params.phone) {
        setError('يرجى تحديد عميل بصالح');
        setLoading(false);
        return;
      }

      console.log('[PointsHistory] Loading points data with params:', params);

      // Load balance
      try {
        const balanceResponse = await pointsApi.getCustomerPoints(params);

        if (balanceResponse.data?.success && balanceResponse.data?.data?.balance) {
          setBalance(balanceResponse.data.data.balance);
          console.log('[PointsHistory] Balance loaded:', balanceResponse.data.data.balance);
        } else {
          // Customer might not have points yet - that's OK
          console.log('[PointsHistory] No balance found (customer may not have points yet)');
          setBalance(null);
        }
      } catch (balanceErr: any) {
        // If balance fetch fails, continue - customer might not have points yet
        console.log('[PointsHistory] Balance fetch error (may be OK if customer has no points):', balanceErr?.response?.data?.message || balanceErr?.message);
        setBalance(null);
      }

      // Load history
      const historyParams: any = { page, limit };
      if (customerId && customerId.trim()) historyParams.customerId = customerId.trim();
      if (phone && phone.trim()) historyParams.phone = phone.trim();

      console.log('[PointsHistory] Loading history with params:', historyParams);

      const historyResponse = await pointsApi.getCustomerPointsHistory(historyParams);

      console.log('[PointsHistory] History response:', historyResponse);

      if (historyResponse.data?.success) {
        setAllTransactions(historyResponse.data.data?.transactions || []);
        setTotalPages(historyResponse.data.data?.pagination?.pages || 1);
        setTotalTransactions(historyResponse.data.data?.pagination?.total || 0);
        // Clear any previous errors on success
        setError(null);
        console.log('[PointsHistory] Successfully loaded transactions:', historyResponse.data.data?.transactions?.length || 0);
      } else {
        // If response is not successful but has data, it might be empty (no transactions)
        if (historyResponse.data?.data?.transactions) {
          setAllTransactions(historyResponse.data.data.transactions);
          setTotalPages(historyResponse.data.data.pagination?.pages || 1);
          setTotalTransactions(historyResponse.data.data.pagination?.total || 0);
        } else {
          const errorMsg = historyResponse.data?.message || 'فشل تحميل تاريخ النقاط';
          console.error('[PointsHistory] Failed to load history:', errorMsg);
          setError(errorMsg);
          setAllTransactions([]);
          setTransactions([]);
        }
      }
    } catch (err: any) {
      console.error('[PointsHistory] Error loading points data:', {
        error: err,
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
        params: { customerId, phone }
      });
      
      const errorMessage = err?.response?.data?.message || err?.message || 'حدث خطأ أثناء تحميل البيانات';
      
      // For 404, customer might not have points yet - don't show error
      if (err?.response?.status === 404) {
        console.log('[PointsHistory] 404 - Customer may not have points yet');
        setError(null); // Don't show error for 404 - customer just doesn't have points
        setBalance(null);
        setAllTransactions([]);
        setTransactions([]);
      } else if (err?.response?.status === 400) {
        // For 400, show the specific error message from backend
        console.error('[PointsHistory] 400 Bad Request:', errorMessage);
        setError(errorMessage);
        setBalance(null);
        setAllTransactions([]);
        setTransactions([]);
      } else {
        // For other errors (500, network errors, etc), show error message
        console.error('[PointsHistory] Error:', errorMessage);
        setError(errorMessage);
        setAllTransactions([]);
        setTransactions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return '➕';
      case 'spent':
        return '➖';
      case 'expired':
        return '⏰';
      case 'adjusted':
        return '🔧';
      default:
        return '📝';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned':
        return 'text-green-600 dark:text-green-400';
      case 'spent':
        return 'text-red-600 dark:text-red-400';
      case 'expired':
        return 'text-orange-600 dark:text-orange-400';
      case 'adjusted':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'earned':
        return 'نقاط محصل عليها';
      case 'spent':
        return 'نقاط مستخدمة';
      case 'expired':
        return 'نقاط منتهية';
      case 'adjusted':
        return 'تعديل';
      default:
        return type;
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerDropdownOpen(false);
    setCustomerSearchTerm('');
    setPage(1);
    // Update URL params
    setSearchParams({ customerId: customer.id, phone: customer.phone });
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setBalance(null);
    setAllTransactions([]);
    setTransactions([]);
    setError(null);
    setSearchParams({});
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            تاريخ النقاط
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            عرض جميع معاملات النقاط للعميل
          </p>
        </div>
      </div>

      {/* Customer Selection */}
      {!selectedCustomer ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            اختر العميل لعرض تاريخ النقاط
          </label>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن العميل بالاسم أو رقم الهاتف..."
              value={customerSearchTerm}
              onChange={(e) => {
                setCustomerSearchTerm(e.target.value);
                setIsCustomerDropdownOpen(true);
              }}
              onFocus={() => setIsCustomerDropdownOpen(true)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {/* Customer Dropdown */}
            {isCustomerDropdownOpen && (customerSearchTerm.trim().length >= 2 || customers.length > 0) && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsCustomerDropdownOpen(false)}
                />
                <div className="absolute z-20 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {loadingCustomers ? (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      جاري البحث...
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {customerSearchTerm.trim().length >= 2 ? 'لم يتم العثور على عملاء' : 'ابدأ الكتابة للبحث'}
                    </div>
                  ) : (
                    customers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full text-right p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                      >
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {customer.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {customer.phone}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                العميل المحدد
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedCustomer.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedCustomer.phone}
              </p>
            </div>
            <button
              onClick={handleClearCustomer}
              className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              تغيير العميل
            </button>
          </div>
        </div>
      )}

      {/* Balance Card */}
      {balance && (
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-sm opacity-90 mb-1">الرصيد المتاح</p>
              <p className="text-3xl sm:text-4xl font-bold">{balance.availablePoints} نقطة</p>
              {balance.availablePoints > 0 && (
                <p className="text-sm opacity-90 mt-1">
                  ≈ {formatCurrency(balance.availablePoints * 0.01)}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="opacity-90">إجمالي النقاط المحصل عليها</p>
                <p className="text-xl font-bold">{balance.lifetimeEarned}</p>
              </div>
              <div>
                <p className="opacity-90">إجمالي النقاط المستخدمة</p>
                <p className="text-xl font-bold">{balance.lifetimeSpent}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث في المعاملات..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {(['all', 'earned', 'spent', 'expired', 'adjusted'] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setFilterType(type);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterType === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {type === 'all' ? 'الكل' : getTransactionLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Transactions List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">جاري التحميل...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">لا توجد معاملات</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`text-2xl ${getTransactionColor(transaction.transactionType)}`}>
                        {getTransactionIcon(transaction.transactionType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {getTransactionLabel(transaction.transactionType)}
                          </p>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTransactionColor(transaction.transactionType)} bg-opacity-10`}>
                            {transaction.transactionType}
                          </span>
                        </div>
                        {transaction.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            {transaction.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                          {transaction.invoiceNumber && (
                            <span>فاتورة: {transaction.invoiceNumber}</span>
                          )}
                          {transaction.earningStoreId && (
                            <span>متجر: {transaction.earningStoreId}</span>
                          )}
                          {transaction.redeemingStoreId && (
                            <span>متجر الاستبدال: {transaction.redeemingStoreId}</span>
                          )}
                          <span>
                            {new Date(transaction.createdAt).toLocaleDateString('ar-SA', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getTransactionColor(transaction.transactionType)}`}>
                        {transaction.points > 0 ? '+' : ''}{transaction.points}
                      </p>
                      {transaction.pointsValue && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(transaction.pointsValue)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                السابق
              </button>
              <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                صفحة {page} من {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PointsHistoryPage;

