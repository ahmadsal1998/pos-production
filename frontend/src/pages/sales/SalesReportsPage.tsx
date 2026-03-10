import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { salesReportsApi, type ReportParams, type ReportPeriod } from '@/lib/api/client';
import { productsApi, customersApi, categoriesApi, usersApi } from '@/lib/api/client';
import { ReportDataGrid, type ColumnDef } from '@/features/sales/components/ReportDataGrid';
import { AR_LABELS } from '@/shared/constants';

const REPORT_CATEGORIES = [
  { id: 'sales', label: 'تقارير المبيعات' },
  { id: 'profit', label: 'تقارير الأرباح' },
  { id: 'customer', label: 'تقارير العملاء' },
  { id: 'product', label: 'تقارير المنتجات' },
  { id: 'inventory', label: 'تقارير المخزون' },
  { id: 'financial', label: 'التقارير المالية' },
] as const;

type ReportId =
  | 'sales-by-period'
  | 'sales-by-product'
  | 'sales-by-category'
  | 'sales-by-payment-method'
  | 'sales-by-user'
  | 'profit-by-period'
  | 'profit-by-product'
  | 'top-customers'
  | 'customer-debt'
  | 'customer-statement'
  | 'best-selling'
  | 'least-selling'
  | 'products-not-sold'
  | 'current-stock'
  | 'low-stock'
  | 'stock-movement'
  | 'daily-cash'
  | 'discounts'
  | 'returns';

const REPORTS: Array<{
  id: ReportId;
  category: (typeof REPORT_CATEGORIES)[number]['id'];
  label: string;
  columns: ColumnDef[];
  needsCustomer?: boolean;
}> = [
  {
    id: 'sales-by-period',
    category: 'sales',
    label: 'المبيعات حسب الفترة',
    columns: [
      { key: 'periodLabel', label: 'الفترة' },
      { key: 'totalSales', label: 'إجمالي المبيعات', format: 'currency' },
      { key: 'totalInvoices', label: 'عدد الفواتير', format: 'number' },
      { key: 'totalQuantity', label: 'الكمية المباعة', format: 'number' },
    ],
  },
  {
    id: 'sales-by-product',
    category: 'sales',
    label: 'المبيعات حسب المنتج',
    columns: [
      { key: 'productName', label: 'المنتج' },
      { key: 'quantitySold', label: 'الكمية المباعة', format: 'number' },
      { key: 'totalSales', label: 'إجمالي المبيعات', format: 'currency' },
      { key: 'totalProfit', label: 'إجمالي الربح', format: 'currency' },
    ],
  },
  {
    id: 'sales-by-category',
    category: 'sales',
    label: 'المبيعات حسب الفئة',
    columns: [
      { key: 'categoryName', label: 'الفئة' },
      { key: 'quantitySold', label: 'الكمية المباعة', format: 'number' },
      { key: 'totalSales', label: 'إجمالي المبيعات', format: 'currency' },
    ],
  },
  {
    id: 'sales-by-payment-method',
    category: 'sales',
    label: 'المبيعات حسب طريقة الدفع',
    columns: [
      { key: 'paymentMethod', label: 'طريقة الدفع' },
      { key: 'invoiceCount', label: 'عدد الفواتير', format: 'number' },
      { key: 'totalSales', label: 'إجمالي المبيعات', format: 'currency' },
    ],
  },
  {
    id: 'sales-by-user',
    category: 'sales',
    label: 'المبيعات حسب المستخدم (الكاشير)',
    columns: [
      { key: 'userName', label: 'المستخدم' },
      { key: 'invoiceCount', label: 'عدد الفواتير', format: 'number' },
      { key: 'totalSales', label: 'إجمالي المبيعات', format: 'currency' },
    ],
  },
  {
    id: 'profit-by-period',
    category: 'profit',
    label: 'الربح حسب الفترة',
    columns: [
      { key: 'periodLabel', label: 'الفترة' },
      { key: 'totalSales', label: 'إجمالي المبيعات', format: 'currency' },
      { key: 'totalCost', label: 'إجمالي التكلفة', format: 'currency' },
      { key: 'totalProfit', label: 'إجمالي الربح', format: 'currency' },
      { key: 'profitMarginPct', label: 'هامش الربح %', format: 'number' },
    ],
  },
  {
    id: 'profit-by-product',
    category: 'profit',
    label: 'الربح حسب المنتج',
    columns: [
      { key: 'productName', label: 'المنتج' },
      { key: 'quantitySold', label: 'الكمية المباعة', format: 'number' },
      { key: 'avgSalePrice', label: 'سعر البيع', format: 'currency' },
      { key: 'avgCostPrice', label: 'سعر التكلفة', format: 'currency' },
      { key: 'totalProfit', label: 'إجمالي الربح', format: 'currency' },
      { key: 'profitMarginPct', label: 'هامش الربح %', format: 'number' },
    ],
  },
  {
    id: 'top-customers',
    category: 'customer',
    label: 'أفضل العملاء',
    columns: [
      { key: 'customerName', label: 'العميل' },
      { key: 'purchaseCount', label: 'عدد المشتريات', format: 'number' },
      { key: 'totalPurchaseAmount', label: 'إجمالي المشتريات', format: 'currency' },
    ],
  },
  {
    id: 'customer-debt',
    category: 'customer',
    label: 'تقرير مديونية العملاء',
    columns: [
      { key: 'customerName', label: 'العميل' },
      { key: 'totalPurchases', label: 'إجمالي المشتريات', format: 'currency' },
      { key: 'totalPaid', label: 'المدفوع', format: 'currency' },
      { key: 'remainingBalance', label: 'المتبقي', format: 'currency' },
    ],
  },
  {
    id: 'customer-statement',
    category: 'customer',
    label: 'كشف حساب عميل',
    columns: [
      { key: 'date', label: 'التاريخ', format: 'date' },
      { key: 'type', label: 'النوع' },
      { key: 'reference', label: 'المرجع' },
      { key: 'amount', label: 'المبلغ', format: 'currency' },
      { key: 'balance', label: 'الرصيد', format: 'currency' },
    ],
    needsCustomer: true,
  },
  {
    id: 'best-selling',
    category: 'product',
    label: 'الأكثر مبيعاً',
    columns: [
      { key: 'productName', label: 'المنتج' },
      { key: 'quantitySold', label: 'الكمية المباعة', format: 'number' },
      { key: 'totalSales', label: 'إجمالي المبيعات', format: 'currency' },
    ],
  },
  {
    id: 'least-selling',
    category: 'product',
    label: 'الأقل مبيعاً',
    columns: [
      { key: 'productName', label: 'المنتج' },
      { key: 'quantitySold', label: 'الكمية المباعة', format: 'number' },
      { key: 'totalSales', label: 'إجمالي المبيعات', format: 'currency' },
    ],
  },
  {
    id: 'products-not-sold',
    category: 'product',
    label: 'منتجات لم تُبع في الفترة',
    columns: [
      { key: 'productName', label: 'المنتج' },
    ],
  },
  {
    id: 'current-stock',
    category: 'inventory',
    label: 'تقرير المخزون الحالي',
    columns: [
      { key: 'productName', label: 'المنتج' },
      { key: 'availableQuantity', label: 'الكمية المتوفرة', format: 'number' },
      { key: 'costPrice', label: 'سعر التكلفة', format: 'currency' },
      { key: 'totalInventoryValue', label: 'قيمة المخزون', format: 'currency' },
    ],
  },
  {
    id: 'low-stock',
    category: 'inventory',
    label: 'تقرير المخزون المنخفض',
    columns: [
      { key: 'productName', label: 'المنتج' },
      { key: 'availableQuantity', label: 'الكمية المتوفرة', format: 'number' },
      { key: 'minStockLevel', label: 'الحد الأدنى', format: 'number' },
    ],
  },
  {
    id: 'stock-movement',
    category: 'inventory',
    label: 'حركة المخزون',
    columns: [
      { key: 'productName', label: 'المنتج' },
      { key: 'purchases', label: 'المشتريات', format: 'number' },
      { key: 'sales', label: 'المبيعات', format: 'number' },
      { key: 'remainingQuantity', label: 'الكمية المتبقية', format: 'number' },
    ],
  },
  {
    id: 'daily-cash',
    category: 'financial',
    label: 'تقرير الصندوق اليومي',
    columns: [
      { key: 'totalSales', label: 'إجمالي المبيعات', format: 'currency' },
      { key: 'totalExpenses', label: 'إجمالي المصروفات', format: 'currency' },
      { key: 'totalProfit', label: 'صافي الربح', format: 'currency' },
    ],
  },
  {
    id: 'discounts',
    category: 'financial',
    label: 'تقرير الخصومات',
    columns: [
      { key: 'invoiceNumber', label: 'رقم الفاتورة' },
      { key: 'date', label: 'التاريخ', format: 'date' },
      { key: 'totalItemDiscount', label: 'خصم الصنف', format: 'currency' },
      { key: 'invoiceDiscount', label: 'خصم الفاتورة', format: 'currency' },
      { key: 'totalDiscount', label: 'إجمالي الخصم', format: 'currency' },
    ],
  },
  {
    id: 'returns',
    category: 'financial',
    label: 'تقرير المرتجعات',
    columns: [
      { key: 'invoiceNumber', label: 'رقم الفاتورة' },
      { key: 'date', label: 'التاريخ', format: 'date' },
      { key: 'total', label: 'المبلغ المرتجع', format: 'currency' },
    ],
  },
];

const PERIOD_OPTIONS = [
  { value: 'custom', label: 'نطاق مخصص' },
  { value: 'daily', label: 'يومي' },
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'monthly', label: 'شهري' },
];

export default function SalesReportsPage() {
  const [category, setCategory] = useState<(typeof REPORT_CATEGORIES)[number]['id']>('sales');
  const [reportId, setReportId] = useState<ReportId | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [period, setPeriod] = useState<ReportPeriod>('custom');
  const [productId, setProductId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportRows, setReportRows] = useState<Record<string, unknown>[]>([]);
  const [reportSummary, setReportSummary] = useState<Record<string, unknown> | null>(null);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const reportsInCategory = REPORTS.filter((r) => r.category === category);
  const selectedReport = reportId ? REPORTS.find((r) => r.id === reportId) : null;

  const loadOptions = useCallback(async () => {
    try {
      const [prodsRes, custRes, catRes, usersRes] = await Promise.all([
        productsApi.getProducts({ page: 1, limit: 500 }).catch(() => ({ data: { products: [] } })),
        customersApi.getCustomers().catch(() => ({ data: { customers: [] } })),
        categoriesApi.getCategories().catch(() => ({ data: [] })),
        usersApi.getUsers({ page: 1, limit: 200 }).catch(() => ({ data: { users: [] } })),
      ]);
      const prods = (prodsRes as any)?.data?.products ?? (prodsRes as any)?.products ?? [];
      const custs = (custRes as any)?.data?.customers ?? (custRes as any)?.customers ?? [];
      const cats = (catRes as any)?.data ?? (catRes as any) ?? [];
      const usrs = (usersRes as any)?.data?.users ?? (usersRes as any)?.users ?? [];
      setProducts(prods.map((p: any) => ({ id: p.id ?? p._id, name: p.name ?? '' })));
      setCustomers(custs.map((c: any) => ({ id: c.id ?? c._id, name: c.name ?? '' })));
      setCategories(Array.isArray(cats) ? cats.map((c: any) => ({ id: c.id ?? c._id, name: c.name ?? '' })) : []);
      setUsers(usrs.map((u: any) => ({ id: u.userId ?? u.id ?? u._id, name: u.username ?? u.name ?? '' })));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const buildParams = useCallback((): ReportParams => {
    const params: ReportParams = {};
    if (fromDate) params.startDate = fromDate;
    if (toDate) params.endDate = toDate;
    if (reportId === 'sales-by-period') params.period = period;
    if (productId) params.productId = productId;
    if (customerId) params.customerId = customerId;
    if (categoryId) params.categoryId = categoryId;
    if (userId) params.userId = userId;
    return params;
  }, [fromDate, toDate, reportId, period, productId, customerId, categoryId, userId]);

  const runReport = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    setError(null);
    setReportSummary(null);
    try {
      const params = buildParams();
      switch (reportId) {
        case 'sales-by-period': {
          const data = await salesReportsApi.getSalesByPeriod(params);
          const rows = Array.isArray(data) ? data : (data as any).rows ?? [];
          const summary = (data as any).summary ?? null;
          setReportRows(rows);
          setReportSummary(summary ? { periodLabel: 'الإجمالي', ...summary } : null);
          break;
        }
        case 'sales-by-product':
          setReportRows(await salesReportsApi.getSalesByProduct(params));
          setReportSummary(null);
          break;
        case 'sales-by-category':
          setReportRows(await salesReportsApi.getSalesByCategory(params));
          setReportSummary(null);
          break;
        case 'sales-by-payment-method':
          setReportRows(await salesReportsApi.getSalesByPaymentMethod(params));
          setReportSummary(null);
          break;
        case 'sales-by-user':
          setReportRows(await salesReportsApi.getSalesByUser(params));
          setReportSummary(null);
          break;
        case 'profit-by-period': {
          const data = await salesReportsApi.getProfitByPeriod(params);
          setReportRows(Array.isArray(data) ? data : []);
          setReportSummary(null);
          break;
        }
        case 'profit-by-product':
          setReportRows(await salesReportsApi.getProfitByProduct(params));
          setReportSummary(null);
          break;
        case 'top-customers':
          setReportRows(await salesReportsApi.getTopCustomers(params));
          setReportSummary(null);
          break;
        case 'customer-debt':
          setReportRows(await salesReportsApi.getCustomerDebtReport(params));
          setReportSummary(null);
          break;
        case 'customer-statement': {
          if (!params.customerId) {
            setError('يرجى اختيار عميل لتقرير كشف الحساب.');
            setReportRows([]);
            break;
          }
          const data = await salesReportsApi.getCustomerStatement(params);
          const mov = (data as any).movements ?? [];
          setReportRows(mov.map((m: any) => ({ ...m, type: m.type === 'sale' ? 'بيع' : 'دفعة' })));
          setReportSummary(null);
          break;
        }
        case 'best-selling':
          setReportRows(await salesReportsApi.getBestSellingProducts(params));
          setReportSummary(null);
          break;
        case 'least-selling':
          setReportRows(await salesReportsApi.getLeastSellingProducts(params));
          setReportSummary(null);
          break;
        case 'products-not-sold':
          setReportRows(await salesReportsApi.getProductsNotSold(params));
          setReportSummary(null);
          break;
        case 'current-stock':
          setReportRows(await salesReportsApi.getCurrentStockReport(params));
          setReportSummary(null);
          break;
        case 'low-stock':
          setReportRows(await salesReportsApi.getLowStockReport(params));
          setReportSummary(null);
          break;
        case 'stock-movement':
          setReportRows(await salesReportsApi.getStockMovementReport(params));
          setReportSummary(null);
          break;
        case 'daily-cash': {
          const data = await salesReportsApi.getDailyCashReport(params);
          setReportRows([data as any]);
          setReportSummary(null);
          break;
        }
        case 'discounts': {
          const data = await salesReportsApi.getDiscountReport(params);
          setReportRows((data as any).rows ?? []);
          setReportSummary({
            invoiceNumber: 'الإجمالي',
            date: '',
            totalItemDiscount: '',
            invoiceDiscount: '',
            totalDiscount: (data as any).totalDiscounts ?? 0,
          });
          break;
        }
        case 'returns': {
          const data = await salesReportsApi.getReturnsReport(params);
          setReportRows((data as any).rows ?? []);
          setReportSummary({
            invoiceNumber: `عدد الفواتير: ${(data as any).returnCount ?? 0}`,
            date: '',
            total: (data as any).totalReturnedAmount ?? 0,
          });
          break;
        }
        default:
          setReportRows([]);
      }
    } catch (e: any) {
      setError(e?.message || 'فشل تحميل التقرير');
      setReportRows([]);
      setReportSummary(null);
    } finally {
      setLoading(false);
    }
  }, [reportId, buildParams]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center gap-4">
          <Link
            to="/sales"
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            ← {AR_LABELS.sales}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">تقارير المبيعات</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">نوع التقرير</h2>
              <div className="space-y-2">
                {REPORT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategory(cat.id);
                      setReportId('');
                    }}
                    className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      category === cat.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">التقرير</label>
                <select
                  value={reportId}
                  onChange={(e) => setReportId(e.target.value as ReportId)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                >
                  <option value="">-- اختر --</option>
                  {reportsInCategory.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          <main className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">الفلاتر</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{AR_LABELS.from}</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{AR_LABELS.to}</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                  />
                </div>
                {reportId === 'sales-by-period' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">الفترة</label>
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                    >
                      {PERIOD_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">المنتج</label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                  >
                    <option value="">الكل</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">العميل</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                  >
                    <option value="">الكل</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">الفئة</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                  >
                    <option value="">الكل</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">المستخدم</label>
                  <select
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                  >
                    <option value="">الكل</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={runReport}
                  disabled={!reportId || loading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'جاري التحميل...' : 'إنشاء التقرير'}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
                {error}
              </div>
            )}

            {selectedReport && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <ReportDataGrid
                  title={selectedReport.label}
                  reportName={selectedReport.label}
                  columns={selectedReport.columns}
                  rows={reportRows}
                  summary={reportSummary ?? undefined}
                  loading={loading}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
