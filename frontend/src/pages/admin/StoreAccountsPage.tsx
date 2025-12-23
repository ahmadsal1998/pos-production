import React, { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/lib/api/client';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { useAuthStore } from '@/app/store';

interface StoreAccount {
  id: string;
  storeId: string;
  storeName: string;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  netPointsBalance: number;
  pointsValuePerPoint: number;
  totalPointsValueIssued: number;
  totalPointsValueRedeemed: number;
  netFinancialBalance: number;
  amountOwed: number;
  lastUpdated: string;
}

interface Store {
  id: string;
  storeId: string;
  name: string;
  isActive?: boolean;
}

interface Transaction {
  id: string;
  _id?: string;
  transactionType: 'earned' | 'spent';
  points: number;
  pointsValue?: number;
  invoiceNumber?: string;
  description?: string;
  earningStoreId?: string;
  redeemingStoreId?: string;
  globalCustomerId?: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  // Calculated fields
  runningPointsBalance?: number;
  runningFinancialBalance?: number;
}

interface TransactionWithBalance extends Transaction {
  runningPointsBalance: number;
  runningFinancialBalance: number;
}

const StoreAccountsPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const { user } = useAuthStore();
  const [accounts, setAccounts] = useState<StoreAccount[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<StoreAccount | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState<TransactionWithBalance[]>([]);
  const [transactionsSummary, setTransactionsSummary] = useState<any>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Check if user is a store owner (not system admin)
  const isStoreOwner = user && user.storeId && user.id !== 'admin';

  useEffect(() => {
    loadStores();
    loadAccounts();
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showTransactions && selectedStoreId && autoRefresh) {
      // Set up auto-refresh every 10 seconds
      refreshIntervalRef.current = setInterval(() => {
        loadAccountTransactions(selectedStoreId, currentPage, false);
      }, 10000);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }
  }, [showTransactions, selectedStoreId, autoRefresh, currentPage]);

  const loadStores = async () => {
    try {
      const response = await adminApi.getStores();
      if (response.data.success) {
        setStores(response.data.data.stores);
      }
    } catch (err: any) {
      console.error('Failed to load stores:', err);
    }
  };

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminApi.getStorePointsAccounts();
      if (response.data.success) {
        const loadedAccounts = response.data.data.accounts;
        setAccounts(loadedAccounts);
        
        // Auto-select account for store owners if there's only one account
        if (isStoreOwner && loadedAccounts.length === 1) {
          const account = loadedAccounts[0];
          setSelectedAccount(account);
          setSelectedStoreId(account.storeId);
        }
      }
    } catch (err: any) {
      console.error('Failed to load store accounts:', err);
      setError(err?.response?.data?.message || 'فشل تحميل حسابات المتاجر');
    } finally {
      setLoading(false);
    }
  };

  const calculateRunningBalances = (transactions: Transaction[]): TransactionWithBalance[] => {
    // Sort transactions by date (oldest first) to calculate running balance chronologically
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let runningPoints = 0;
    let runningFinancial = 0;

    // Calculate running balance from the beginning
    const transactionsWithBalance = sortedTransactions.map((transaction) => {
      const pointsValue = transaction.pointsValue || 0;
      
      if (transaction.transactionType === 'earned') {
        // Points issued by this store - increases store's debt (positive balance means store owes)
        runningPoints += transaction.points;
        runningFinancial += pointsValue;
      } else {
        // Points redeemed at this store - decreases store's debt
        runningPoints -= Math.abs(transaction.points);
        runningFinancial -= pointsValue;
      }

      return {
        ...transaction,
        runningPointsBalance: runningPoints,
        runningFinancialBalance: runningFinancial,
      };
    });

    // Reverse to show newest first (most recent transactions at top)
    return transactionsWithBalance.reverse();
  };

  const loadAccountTransactions = async (storeId: string, page: number = 1, showLoading: boolean = true) => {
    if (showLoading) {
      setLoadingTransactions(true);
    }
    
    try {
      const params: any = {
        limit: 100,
        page: page,
      };

      if (transactionTypeFilter !== 'all') {
        params.transactionType = transactionTypeFilter;
      }
      if (startDate) {
        params.startDate = startDate;
      }
      if (endDate) {
        params.endDate = endDate;
      }

      const response = await adminApi.getStorePointsTransactions(storeId, params);
      if (response.data.success) {
        const rawTransactions = response.data.data.transactions;
        const summary = response.data.data.summary;
        const pagination = response.data.data.pagination;

        // Calculate running balances from the beginning
        const transactionsWithBalance = calculateRunningBalances(rawTransactions);

        setTransactions(transactionsWithBalance);
        setTransactionsSummary(summary);
        setTotalPages(pagination.pages);
        setTotalTransactions(pagination.total);
        setCurrentPage(page);

        // Also refresh accounts list to get latest balances
        if (showLoading) {
          loadAccounts();
        }
      }
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
    } finally {
      if (showLoading) {
        setLoadingTransactions(false);
      }
    }
  };

  const handleViewAccount = (account: StoreAccount) => {
    setSelectedAccount(account);
    setSelectedStoreId(account.storeId);
    setShowTransactions(true);
    setCurrentPage(1);
    setTransactionTypeFilter('all');
    setStartDate('');
    setEndDate('');
    loadAccountTransactions(account.storeId, 1);
  };

  const handleFilterChange = () => {
    if (selectedStoreId) {
      setCurrentPage(1);
      loadAccountTransactions(selectedStoreId, 1);
    }
  };

  const getStatusColor = (isActive?: boolean) => {
    return isActive !== false ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getStatusLabel = (account: StoreAccount) => {
    const store = stores.find(s => s.storeId === account.storeId);
    return store?.isActive !== false ? 'نشط' : 'معلق';
  };

  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.storeId === storeId);
    return store?.name || storeId;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isStoreOwner ? 'حساب النقاط الخاص بي' : 'حسابات النقاط للمتاجر'}
          </h1>
          <p className="mt-2 text-slate-400">
            {isStoreOwner 
              ? 'عرض وإدارة حساب النقاط الخاص بمتجرك مع سجل تفصيلي للمعاملات'
              : 'عرض وإدارة حسابات النقاط لجميع المتاجر مع سجل تفصيلي للمعاملات'
            }
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">جاري التحميل...</p>
        </div>
      ) : (
        <>
          {/* Accounts Table */}
          <div className="bg-slate-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      المتجر
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      النقاط الصادرة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      النقاط المستبدلة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      رصيد النقاط
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      المبلغ المستحق
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800 divide-y divide-slate-700">
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-slate-400">
                        لا توجد حسابات متاجر
                      </td>
                    </tr>
                  ) : (
                    accounts.map((account) => {
                      const store = stores.find(s => s.storeId === account.storeId);
                      return (
                        <tr key={account.id} className="hover:bg-slate-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">
                              {account.storeName || account.storeId}
                            </div>
                            <div className="text-xs text-slate-400">{account.storeId}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                            {account.totalPointsIssued.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                            {account.totalPointsRedeemed.toLocaleString()}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            account.netPointsBalance >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {account.netPointsBalance >= 0 ? '+' : ''}{account.netPointsBalance.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-orange-400">
                            {formatCurrency(account.amountOwed)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${getStatusColor(store?.isActive)}`}>
                              {getStatusLabel(account)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleViewAccount(account)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              عرض التفاصيل
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-1">إجمالي النقاط الصادرة</p>
              <p className="text-2xl font-bold text-white">
                {accounts.reduce((sum, acc) => sum + acc.totalPointsIssued, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-1">إجمالي النقاط المستبدلة</p>
              <p className="text-2xl font-bold text-white">
                {accounts.reduce((sum, acc) => sum + acc.totalPointsRedeemed, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-1">إجمالي المبلغ المستحق</p>
              <p className="text-2xl font-bold text-orange-400">
                {formatCurrency(accounts.reduce((sum, acc) => sum + acc.amountOwed, 0))}
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-1">عدد المتاجر</p>
              <p className="text-2xl font-bold text-white">{accounts.length}</p>
            </div>
          </div>
        </>
      )}

      {/* Enhanced Transactions Modal */}
      {showTransactions && selectedAccount && selectedStoreId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-700">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    سجل تفصيلي: {selectedAccount.storeName}
                  </h2>
                  <p className="text-slate-400 mt-1">{selectedAccount.storeId}</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="rounded"
                    />
                    <span>تحديث تلقائي</span>
                  </label>
                  <button
                    onClick={() => {
                      setShowTransactions(false);
                      setSelectedAccount(null);
                      setTransactions([]);
                      setAutoRefresh(false);
                    }}
                    className="text-slate-400 hover:text-white text-2xl"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Account Summary */}
              {transactionsSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-700 rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-1">إجمالي النقاط الصادرة</p>
                    <p className="text-lg font-bold text-white">{transactionsSummary.totalIssued.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatCurrency(transactionsSummary.totalIssuedValue || 0)}
                    </p>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-1">إجمالي النقاط المستبدلة</p>
                    <p className="text-lg font-bold text-white">{transactionsSummary.totalRedeemed.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatCurrency(transactionsSummary.totalRedeemedValue || 0)}
                    </p>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-1">رصيد النقاط الحالي</p>
                    <p className={`text-lg font-bold ${transactionsSummary.netPointsBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {transactionsSummary.netPointsBalance >= 0 ? '+' : ''}{transactionsSummary.netPointsBalance.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-1">المبلغ المستحق الحالي</p>
                    <p className="text-lg font-bold text-orange-400">{formatCurrency(transactionsSummary.amountOwed)}</p>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="bg-slate-700 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">نوع المعاملة</label>
                    <select
                      value={transactionTypeFilter}
                      onChange={(e) => {
                        setTransactionTypeFilter(e.target.value);
                        handleFilterChange();
                      }}
                      className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm"
                    >
                      <option value="all">الكل</option>
                      <option value="earned">صادرة</option>
                      <option value="spent">مستبدلة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">من تاريخ</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        handleFilterChange();
                      }}
                      className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">إلى تاريخ</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        handleFilterChange();
                      }}
                      className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setTransactionTypeFilter('all');
                        setStartDate('');
                        setEndDate('');
                        handleFilterChange();
                      }}
                      className="w-full bg-slate-600 hover:bg-slate-500 text-white rounded px-3 py-2 text-sm transition-colors"
                    >
                      إعادة تعيين
                    </button>
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              {loadingTransactions ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">جاري التحميل...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">لا توجد معاملات</p>
                </div>
              ) : (
                <>
                  <div className="bg-slate-700 rounded-lg overflow-hidden mb-4">
                    <table className="min-w-full divide-y divide-slate-600">
                      <thead className="bg-slate-600">
                        <tr>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase">التاريخ</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase">النوع</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase">العميل</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase">الفاتورة</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase">النقاط</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase">القيمة</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase">رصيد النقاط</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase">رصيد المالي</th>
                        </tr>
                      </thead>
                      <tbody className="bg-slate-800 divide-y divide-slate-700">
                        {transactions.map((transaction) => {
                          const isEarned = transaction.transactionType === 'earned';
                          const isThisStore = isEarned 
                            ? transaction.earningStoreId === selectedStoreId
                            : transaction.redeemingStoreId === selectedStoreId;
                          
                          return (
                            <tr key={transaction.id || transaction._id} className="hover:bg-slate-700/50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                                {new Date(transaction.createdAt).toLocaleDateString('ar-SA', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  isEarned 
                                    ? 'bg-green-900/50 text-green-300' 
                                    : 'bg-red-900/50 text-red-300'
                                }`}>
                                  {isEarned ? 'صادرة' : 'مستبدلة'}
                                </span>
                                {!isThisStore && (
                                  <div className="text-xs text-slate-400 mt-1">
                                    {isEarned 
                                      ? `من: ${getStoreName(transaction.earningStoreId || '')}`
                                      : `إلى: ${getStoreName(transaction.redeemingStoreId || '')}`
                                    }
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-300">
                                <div>{transaction.customerName || 'غير محدد'}</div>
                                {(transaction.globalCustomerId || transaction.customerPhone) && (
                                  <div className="text-xs text-slate-400">
                                    {transaction.customerPhone || transaction.globalCustomerId}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                                {transaction.invoiceNumber || '-'}
                              </td>
                              <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold ${
                                isEarned ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {isEarned ? '+' : '-'}{Math.abs(transaction.points).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                                {transaction.pointsValue ? formatCurrency(transaction.pointsValue) : '-'}
                              </td>
                              <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                                (transaction.runningPointsBalance || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {(transaction.runningPointsBalance || 0) >= 0 ? '+' : ''}
                                {(transaction.runningPointsBalance || 0).toLocaleString()}
                              </td>
                              <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                                (transaction.runningFinancialBalance || 0) >= 0 ? 'text-orange-400' : 'text-green-400'
                              }`}>
                                {formatCurrency(transaction.runningFinancialBalance || 0)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between bg-slate-700 rounded-lg p-4">
                      <div className="text-sm text-slate-300">
                        عرض {((currentPage - 1) * 100) + 1} - {Math.min(currentPage * 100, totalTransactions)} من {totalTransactions}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (currentPage > 1) {
                              loadAccountTransactions(selectedStoreId, currentPage - 1);
                            }
                          }}
                          disabled={currentPage === 1}
                          className="px-4 py-2 bg-slate-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-500 transition-colors"
                        >
                          السابق
                        </button>
                        <span className="px-4 py-2 text-slate-300">
                          صفحة {currentPage} من {totalPages}
                        </span>
                        <button
                          onClick={() => {
                            if (currentPage < totalPages) {
                              loadAccountTransactions(selectedStoreId, currentPage + 1);
                            }
                          }}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 bg-slate-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-500 transition-colors"
                        >
                          التالي
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreAccountsPage;
