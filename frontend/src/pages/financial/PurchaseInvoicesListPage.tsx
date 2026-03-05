import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PurchaseOrder, PurchaseStatus, PurchasePaymentMethod } from '@/features/financial/types';
import {
  AR_LABELS,
  SearchIcon,
  EditIcon,
  ViewIcon,
  GridViewIcon,
  TableViewIcon,
} from '@/shared/constants';
import { formatDate } from '@/shared/utils';
import { useResponsiveViewMode } from '@/shared/hooks';
import { purchasesApi } from '@/lib/api';
import { useCurrency } from '@/shared/contexts/CurrencyContext';

const PAGE_SIZE = 15;

const STATUS_STYLES: Record<PurchaseStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  Completed: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};
const STATUS_LABELS: Record<PurchaseStatus, string> = {
  Pending: AR_LABELS.pending,
  Completed: AR_LABELS.completed,
  Cancelled: AR_LABELS.cancelled,
};
const PAYMENT_METHOD_LABELS: Record<PurchasePaymentMethod, string> = {
  Cash: AR_LABELS.cash,
  'Bank Transfer': AR_LABELS.bankTransfer,
  Credit: AR_LABELS.credit,
  Cheque: AR_LABELS.cheque,
};

const PurchaseInvoicesListPage: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { viewMode: layout, setViewMode: setLayout } = useResponsiveViewMode('purchase-invoices', 'table', 'grid');
  const { formatCurrency } = useCurrency();

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await purchasesApi.getPurchases().catch(() => ({ data: { purchases: [] } }));
      const purList = (res as any)?.data?.data?.purchases ?? (res as any)?.data?.purchases ?? [];
      setPurchases(
        Array.isArray(purList)
          ? purList.map((p: any) => ({
              id: p.id,
              poNumber: p.poNumber ?? p.id,
              supplierId: p.supplierId,
              supplierName: p.supplierName,
              items: p.items ?? [],
              subtotal: p.subtotal ?? 0,
              tax: p.tax ?? 0,
              discount: p.discount ?? 0,
              totalAmount: p.totalAmount ?? 0,
              status: p.status ?? 'Pending',
              purchaseDate: p.purchaseDate ?? p.createdAt,
              paymentMethod: p.paymentMethod ?? 'Cash',
              chequeDetails: p.chequeDetails,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
              notes: p.notes,
            }))
          : []
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const filteredPurchases = useMemo(() => {
    return purchases
      .filter((p) => {
        const matchesSearch = searchTerm
          ? (p.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
          : true;
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [purchases, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / PAGE_SIZE));
  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPurchases.slice(start, start + PAGE_SIZE);
  }, [filteredPurchases, currentPage]);

  const summaryTotal = useMemo(
    () => filteredPurchases.reduce((sum, p) => sum + (p.totalAmount ?? 0), 0),
    [filteredPurchases]
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const rangeStart = (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredPurchases.length);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-100/30 dark:from-slate-950 dark:via-amber-950/20 dark:to-orange-950/30" />
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-rose-400/15 to-orange-400/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Tabs - same as PurchasesPage for consistent navigation */}
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div />
          <div className="w-full overflow-x-auto scroll-smooth horizontal-nav-scroll">
            <div className="flex gap-2 sm:gap-3 min-w-max pb-2 items-center">
              {[
                { id: 'purchases', label: 'المشتريات', to: '/purchases' },
                { id: 'suppliers', label: 'الموردين', to: '/suppliers' },
                { id: 'reports', label: 'التقارير', to: '/reports' },
              ].map((tab) => (
                <Link
                  key={tab.id}
                  to={tab.to}
                  className="group relative px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md"
                >
                  <span className="relative">{tab.label}</span>
                </Link>
              ))}
              <Link
                to="/purchases/invoices"
                className="group relative px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/50"
              >
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur" />
                <span className="relative">{AR_LABELS.purchaseInvoicesList}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Summary section: total amount & invoice count */}
        <section className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-sm p-6 sm:p-8 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            ملخص الفواتير
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">عدد الفواتير</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {filteredPurchases.length} {filteredPurchases.length === 1 ? 'فاتورة' : 'فواتير'}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">{AR_LABELS.grandTotal}</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(summaryTotal)}
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-sm p-4 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={AR_LABELS.searchByPOorSupplier || 'ابحث برقم الطلب أو المورد...'}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-right"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as PurchaseStatus | 'all');
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm min-w-[140px]"
            >
              <option value="all">كل الحالات</option>
              {(Object.keys(STATUS_LABELS) as PurchaseStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden w-full sm:w-auto flex-shrink-0">
              <button
                onClick={() => setLayout('table')}
                className={`flex-1 sm:flex-none px-3 py-2 ${layout === 'table' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                title="عرض الجدول"
              >
                <TableViewIcon />
              </button>
              <button
                onClick={() => setLayout('grid')}
                className={`flex-1 sm:flex-none px-3 py-2 ${layout === 'grid' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                title="عرض الشبكة"
              >
                <GridViewIcon />
              </button>
            </div>
          </div>
        </section>

        {/* Invoice list: Table or Card grid */}
        <section className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-sm overflow-hidden backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
          {loading ? (
            <div className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
              جاري التحميل...
            </div>
          ) : layout === 'table' ? (
            <div className="overflow-x-auto overscroll-contain">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {AR_LABELS.poNumber}
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {AR_LABELS.supplier}
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {AR_LABELS.purchaseDate}
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {AR_LABELS.totalAmount}
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {AR_LABELS.status}
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center">
                      {AR_LABELS.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedPurchases.length > 0 ? (
                    paginatedPurchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {purchase.poNumber ?? purchase.id}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100" title={purchase.supplierName}>
                            {purchase.supplierName}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {formatDate(purchase.purchaseDate)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-orange-600">
                          {formatCurrency(purchase.totalAmount)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${STATUS_STYLES[purchase.status]}`}>
                            {STATUS_LABELS[purchase.status]}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              to={`/purchases/invoices/${purchase.id}`}
                              className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                              aria-label={`${AR_LABELS.viewDetails} ${purchase.id}`}
                            >
                              <ViewIcon className="h-5 w-5" />
                            </Link>
                            <Link
                              to={`/purchases?edit=${purchase.id}`}
                              className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors"
                              aria-label={`${AR_LABELS.edit} ${purchase.id}`}
                            >
                              <EditIcon className="h-5 w-5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                        {AR_LABELS.noSalesFound}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedPurchases.length > 0 ? (
                  paginatedPurchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="rounded-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-gray-800/80 p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-5"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {AR_LABELS.poNumber}
                        </span>
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[purchase.status]}`}>
                          {STATUS_LABELS[purchase.status]}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {purchase.poNumber ?? purchase.id}
                      </p>
                      <dl className="space-y-3 flex-1">
                        <div>
                          <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{AR_LABELS.supplier}</dt>
                          <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{purchase.supplierName}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{AR_LABELS.purchaseDate}</dt>
                          <dd className="text-sm text-gray-700 dark:text-gray-300">{formatDate(purchase.purchaseDate)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{AR_LABELS.totalAmount}</dt>
                          <dd className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {formatCurrency(purchase.totalAmount)}
                          </dd>
                        </div>
                      </dl>
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
                        <Link
                          to={`/purchases/invoices/${purchase.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <ViewIcon className="h-4 w-4" />
                          {AR_LABELS.viewDetails}
                        </Link>
                        <Link
                          to={`/purchases?edit=${purchase.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors"
                        >
                          <EditIcon className="h-4 w-4" />
                          {AR_LABELS.edit}
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-12">
                    {AR_LABELS.noSalesFound}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pagination: always visible and clear */}
          {!loading && filteredPurchases.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-8 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                عرض {rangeStart}–{rangeEnd} من {filteredPurchases.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  aria-label="الصفحة الأولى"
                >
                  الأولى
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  aria-label="السابق"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  السابق
                </button>
                <span className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl min-w-[5rem] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  aria-label="التالي"
                >
                  التالي
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12l-7 7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  aria-label="الصفحة الأخيرة"
                >
                  الأخيرة
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default PurchaseInvoicesListPage;
