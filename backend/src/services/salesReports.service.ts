/**
 * Sales Reports Service
 * Dedicated backend logic for all sales-related reports. Uses aggregation for performance.
 * All profit calculations use actual cost of sold unit (item.costPrice), not main unit.
 */

import { getSaleModelForStore } from '../utils/saleModel';
import { getProductModelForStore } from '../utils/productModel';
import { getCustomerModelForStore } from '../utils/customerModel';
import { getCustomerPaymentModelForStore } from '../utils/customerPaymentModel';
import { getBusinessDateFilterRange } from '../utils/businessDate';
import Settings from '../models/Settings';
import Category from '../models/Category';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface ReportFilters {
  startDate?: string | null;
  endDate?: string | null;
  productId?: string | null;
  customerId?: string | null;
  categoryId?: string | null;
  userId?: string | null; // seller
  period?: ReportPeriod;
}

function buildDateFilter(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  businessDayStartTime?: string,
  timezone?: string
): Record<string, unknown> {
  const { start, end } = getBusinessDateFilterRange(
    startDate || null,
    endDate || null,
    businessDayStartTime,
    timezone
  );
  const dateFilter: Record<string, unknown> = {};
  if (start) (dateFilter as any).$gte = start;
  if (end) (dateFilter as any).$lte = end;
  return Object.keys(dateFilter).length ? { date: dateFilter } : {};
}

async function getStoreSettings(storeId: string): Promise<{ businessDayStartTime?: string; timezone?: string }> {
  const [businessDaySetting, timezoneSetting] = await Promise.all([
    Settings.findOne({ storeId: storeId.toLowerCase(), key: 'businessdaystarttime' }),
    Settings.findOne({ storeId: storeId.toLowerCase(), key: 'businessdaytimezone' }),
  ]);
  const businessDayStartTime = businessDaySetting?.value;
  const timezone = timezoneSetting?.value;
  return { businessDayStartTime, timezone };
}

async function getBaseMatch(
  storeId: string,
  filters: ReportFilters
): Promise<{ match: Record<string, unknown>; businessDayStartTime?: string; timezone?: string }> {
  const normalizedStoreId = storeId.toLowerCase().trim();
  const { businessDayStartTime, timezone } = await getStoreSettings(storeId);
  const dateFilter = buildDateFilter(
    filters.startDate,
    filters.endDate,
    businessDayStartTime,
    timezone
  );
  const match: Record<string, unknown> = {
    storeId: normalizedStoreId,
    ...dateFilter,
  };
  // Exclude return invoices from sales reports unless we want returns separately
  if (filters.customerId) match.customerId = filters.customerId;
  if (filters.userId) match.seller = filters.userId;
  return { match, businessDayStartTime, timezone };
}

/** Sales by Period: total sales, total invoices, total quantity sold. Optional period grouping: daily, weekly, monthly. */
export async function getSalesByPeriod(
  storeId: string,
  filters: ReportFilters
): Promise<{
  rows: Array<{ periodLabel: string; totalSales: number; totalInvoices: number; totalQuantity: number }>;
  summary: { totalSales: number; totalInvoices: number; totalQuantity: number };
}> {
  const Sale = await getSaleModelForStore(storeId);
  const { match } = await getBaseMatch(storeId, filters);

  // Exclude returns for "sales" totals (or include as negative - here we exclude for clarity)
  const salesMatch = { ...match, isReturn: { $ne: true } };

  const period = filters.period || 'custom';
  let groupId: any = null;
  if (period === 'daily') {
    groupId = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
  } else if (period === 'weekly') {
    groupId = { year: { $year: '$date' }, week: { $week: '$date' } };
  } else if (period === 'monthly') {
    groupId = { year: { $year: '$date' }, month: { $month: '$date' } };
  }

  const pipeline: any[] = [
    { $match: salesMatch },
    {
      $group: {
        _id: groupId,
        totalSales: { $sum: '$total' },
        invoiceCount: { $sum: 1 },
        totalQuantity: { $sum: { $reduce: { input: '$items', initialValue: 0, in: { $add: ['$$value', { $abs: '$$this.quantity' }] } } } },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const result = await Sale.aggregate(pipeline);
  const rows = result.map((r: any) => ({
    periodLabel:
      r._id == null
        ? 'الإجمالي'
        : typeof r._id === 'string'
          ? r._id
          : r._id && r._id.year != null && r._id.month != null
            ? `${r._id.year}-${String(r._id.month).padStart(2, '0')}`
            : r._id && r._id.year != null && r._id.week != null
              ? `${r._id.year}-W${r._id.week}`
              : String(r._id),
    totalSales: r.totalSales ?? 0,
    totalInvoices: r.invoiceCount ?? 0,
    totalQuantity: r.totalQuantity ?? 0,
  }));

  const summary = rows.reduce(
    (acc, r) => ({
      totalSales: acc.totalSales + r.totalSales,
      totalInvoices: acc.totalInvoices + r.totalInvoices,
      totalQuantity: acc.totalQuantity + r.totalQuantity,
    }),
    { totalSales: 0, totalInvoices: 0, totalQuantity: 0 }
  );
  return { rows, summary };
}

/** Sales by Product: product name, quantity sold, total sales amount, total profit (using item costPrice). */
export async function getSalesByProduct(
  storeId: string,
  filters: ReportFilters
): Promise<Array<{ productId: string; productName: string; quantitySold: number; totalSales: number; totalProfit: number }>> {
  const Sale = await getSaleModelForStore(storeId);
  const { match } = await getBaseMatch(storeId, filters);
  const salesMatch = { ...match, isReturn: { $ne: true } };
  if (filters.productId) (salesMatch as any)['items.productId'] = filters.productId;

  const pipeline = [
    { $match: salesMatch },
    { $unwind: '$items' },
    ...(filters.productId ? [{ $match: { 'items.productId': filters.productId } }] : []),
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        quantitySold: { $sum: { $abs: '$items.quantity' } },
        totalSales: { $sum: '$items.totalPrice' },
        totalCost: { $sum: { $multiply: [{ $abs: '$items.quantity' }, { $ifNull: ['$items.costPrice', 0] }] } },
      },
    },
    { $project: { productId: '$_id', productName: 1, quantitySold: 1, totalSales: 1, totalProfit: { $subtract: ['$totalSales', '$totalCost'] } } },
    { $sort: { totalSales: -1 } },
  ];

  const result = await Sale.aggregate(pipeline);
  return result.map((r: any) => ({
    productId: String(r.productId),
    productName: r.productName || '',
    quantitySold: r.quantitySold ?? 0,
    totalSales: r.totalSales ?? 0,
    totalProfit: r.totalProfit ?? 0,
  }));
}

/** Sales by Category: requires product categoryId lookup. */
export async function getSalesByCategory(
  storeId: string,
  filters: ReportFilters
): Promise<Array<{ categoryId: string; categoryName: string; quantitySold: number; totalSales: number }>> {
  const Sale = await getSaleModelForStore(storeId);
  const Product = await getProductModelForStore(storeId);
  const normalizedStoreId = storeId.toLowerCase().trim();
  const { match } = await getBaseMatch(storeId, filters);
  const salesMatch = { ...match, isReturn: { $ne: true } };

  const productCategoryMap = new Map<string, string>();
  const products = await Product.find({ storeId: normalizedStoreId }).select('_id categoryId').lean();
  const categories = await Category.find({ storeId: normalizedStoreId }).select('_id name').lean();
  const categoryNameMap = new Map(categories.map((c: any) => [String(c._id), c.name]));
  products.forEach((p: any) => {
    const idStr = p._id.toString();
    if (p.categoryId) productCategoryMap.set(idStr, p.categoryId);
  });

  const groupStage = {
    $group: {
      _id: '$items.productId',
      quantitySold: { $sum: { $abs: '$items.quantity' } },
      totalSales: { $sum: '$items.totalPrice' },
    },
  };
  const pipeline = [
    { $match: salesMatch },
    { $unwind: '$items' },
    groupStage,
  ];
  const byProduct = await Sale.aggregate(pipeline);

  const byCategory = new Map<string, { categoryName: string; quantitySold: number; totalSales: number }>();
  for (const row of byProduct) {
    const productId = String(row._id);
    const categoryId = productCategoryMap.get(productId) || 'uncategorized';
    const catName = categoryNameMap.get(categoryId) || 'بدون تصنيف';
    const existing = byCategory.get(categoryId);
    if (existing) {
      existing.quantitySold += row.quantitySold ?? 0;
      existing.totalSales += row.totalSales ?? 0;
    } else {
      byCategory.set(categoryId, { categoryName: catName, quantitySold: row.quantitySold ?? 0, totalSales: row.totalSales ?? 0 });
    }
  }

  if (filters.categoryId) {
    const kept = byCategory.get(filters.categoryId);
    if (!kept) return [];
    return [{ categoryId: filters.categoryId, categoryName: kept.categoryName, quantitySold: kept.quantitySold, totalSales: kept.totalSales }];
  }

  return Array.from(byCategory.entries())
    .map(([categoryId, v]) => ({ categoryId, categoryName: v.categoryName, quantitySold: v.quantitySold, totalSales: v.totalSales }))
    .sort((a, b) => b.totalSales - a.totalSales);
}

/** Sales by Payment Method: Cash, Credit, Card (Bank Transfer), optional Points (0 if not used). */
export async function getSalesByPaymentMethod(
  storeId: string,
  filters: ReportFilters
): Promise<Array<{ paymentMethod: string; invoiceCount: number; totalSales: number }>> {
  const Sale = await getSaleModelForStore(storeId);
  const { match } = await getBaseMatch(storeId, filters);
  const salesMatch = { ...match, isReturn: { $ne: true } };

  const result = await Sale.aggregate([
    { $match: salesMatch },
    { $group: { _id: '$paymentMethod', invoiceCount: { $sum: 1 }, totalSales: { $sum: '$total' } } },
    { $sort: { totalSales: -1 } },
  ]);

  const methodLabels: Record<string, string> = {
    cash: 'نقدي',
    card: 'تحويل بنكي',
    credit: 'آجل (حساب عميل)',
  };
  return result.map((r: any) => ({
    paymentMethod: methodLabels[r._id] || r._id,
    invoiceCount: r.invoiceCount ?? 0,
    totalSales: r.totalSales ?? 0,
  }));
}

/** Sales by User (Cashier). */
export async function getSalesByUser(
  storeId: string,
  filters: ReportFilters
): Promise<Array<{ userName: string; invoiceCount: number; totalSales: number }>> {
  const Sale = await getSaleModelForStore(storeId);
  const { match } = await getBaseMatch(storeId, filters);
  const salesMatch = { ...match, isReturn: { $ne: true } };
  if (filters.userId) (salesMatch as any).seller = filters.userId;

  const result = await Sale.aggregate([
    { $match: salesMatch },
    { $group: { _id: '$seller', invoiceCount: { $sum: 1 }, totalSales: { $sum: '$total' } } },
    { $sort: { totalSales: -1 } },
  ]);
  return result.map((r: any) => ({
    userName: r._id || '',
    invoiceCount: r.invoiceCount ?? 0,
    totalSales: r.totalSales ?? 0,
  }));
}

/** Profit by Period: total sales, total cost, total profit, profit margin %. */
export async function getProfitByPeriod(
  storeId: string,
  filters: ReportFilters
): Promise<Array<{ periodLabel: string; totalSales: number; totalCost: number; totalProfit: number; profitMarginPct: number }>> {
  const Sale = await getSaleModelForStore(storeId);
  const { match } = await getBaseMatch(storeId, filters);
  const salesMatch = { ...match, isReturn: { $ne: true } };

  const result = await Sale.aggregate([
    { $match: salesMatch },
    {
      $project: {
        total: 1,
        itemCost: {
          $reduce: {
            input: '$items',
            initialValue: 0,
            in: { $add: ['$$value', { $multiply: [{ $abs: '$$this.quantity' }, { $ifNull: ['$$this.costPrice', 0] }] }] },
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$total' },
        totalCost: { $sum: '$itemCost' },
      },
    },
    {
      $project: {
        totalSales: 1,
        totalCost: 1,
        totalProfit: { $subtract: ['$totalSales', '$totalCost'] },
      },
    },
  ]);

  const r = result[0];
  const totalSales = r?.totalSales ?? 0;
  const totalCost = r?.totalCost ?? 0;
  const totalProfit = totalSales - totalCost;
  const profitMarginPct = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  return [
    {
      periodLabel: 'الفترة',
      totalSales,
      totalCost,
      totalProfit,
      profitMarginPct,
    },
  ];
}

/** Profit by Product: product name, quantity sold, sale price (avg), cost price (avg), total profit, margin %. */
export async function getProfitByProduct(
  storeId: string,
  filters: ReportFilters
): Promise<
  Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    avgSalePrice: number;
    avgCostPrice: number;
    totalProfit: number;
    profitMarginPct: number;
  }>
> {
  const Sale = await getSaleModelForStore(storeId);
  const { match } = await getBaseMatch(storeId, filters);
  const salesMatch = { ...match, isReturn: { $ne: true } };
  if (filters.productId) (salesMatch as any)['items.productId'] = filters.productId;

  const result = await Sale.aggregate([
    { $match: salesMatch },
    { $unwind: '$items' },
    ...(filters.productId ? [{ $match: { 'items.productId': filters.productId } }] : []),
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        quantitySold: { $sum: { $abs: '$items.quantity' } },
        totalSales: { $sum: '$items.totalPrice' },
        totalCost: { $sum: { $multiply: [{ $abs: '$items.quantity' }, { $ifNull: ['$items.costPrice', 0] }] } },
      },
    },
    {
      $project: {
        productId: '$_id',
        productName: 1,
        quantitySold: 1,
        avgSalePrice: { $cond: [{ $eq: ['$quantitySold', 0] }, 0, { $divide: ['$totalSales', '$quantitySold'] }] },
        avgCostPrice: { $cond: [{ $eq: ['$quantitySold', 0] }, 0, { $divide: ['$totalCost', '$quantitySold'] }] },
        totalProfit: { $subtract: ['$totalSales', '$totalCost'] },
      },
    },
    { $addFields: { profitMarginPct: { $cond: [{ $eq: ['$totalSales', 0] }, 0, { $multiply: [{ $divide: [{ $subtract: ['$totalSales', '$totalCost'] }, '$totalSales'] }, 100] }] } } },
    { $sort: { totalProfit: -1 } },
  ]);

  return result.map((r: any) => ({
    productId: String(r.productId),
    productName: r.productName || '',
    quantitySold: r.quantitySold ?? 0,
    avgSalePrice: r.avgSalePrice ?? 0,
    avgCostPrice: r.avgCostPrice ?? 0,
    totalProfit: r.totalProfit ?? 0,
    profitMarginPct: r.profitMarginPct ?? 0,
  }));
}

/** Top Customers: name, number of purchases, total purchase amount. */
export async function getTopCustomers(
  storeId: string,
  filters: ReportFilters
): Promise<Array<{ customerId: string; customerName: string; purchaseCount: number; totalPurchaseAmount: number }>> {
  const Sale = await getSaleModelForStore(storeId);
  const { match } = await getBaseMatch(storeId, filters);
  const salesMatch = { ...match, isReturn: { $ne: true } };

  const result = await Sale.aggregate([
    { $match: salesMatch },
    { $group: { _id: '$customerId', customerName: { $first: '$customerName' }, purchaseCount: { $sum: 1 }, totalPurchaseAmount: { $sum: '$total' } } },
    { $sort: { totalPurchaseAmount: -1 } },
    { $limit: 100 },
  ]);
  return result.map((r: any) => ({
    customerId: String(r._id || ''),
    customerName: r.customerName || '',
    purchaseCount: r.purchaseCount ?? 0,
    totalPurchaseAmount: r.totalPurchaseAmount ?? 0,
  }));
}

/** Customer Debt: total purchases, total paid (from invoice paidAmount), remaining balance. */
export async function getCustomerDebtReport(
  storeId: string,
  filters: ReportFilters
): Promise<Array<{ customerId: string; customerName: string; totalPurchases: number; totalPaid: number; remainingBalance: number }>> {
  const Sale = await getSaleModelForStore(storeId);
  const { match } = await getBaseMatch(storeId, filters);
  const salesMatch = { ...match, isReturn: { $ne: true } };

  const byCustomer = await Sale.aggregate([
    { $match: salesMatch },
    { $group: { _id: '$customerId', customerName: { $first: '$customerName' }, totalPurchases: { $sum: '$total' }, totalPaid: { $sum: '$paidAmount' } } },
  ]);

  const rows = byCustomer.map((r: any) => {
    const customerId = String(r._id || '');
    const totalPurchases = r.totalPurchases ?? 0;
    const totalPaid = r.totalPaid ?? 0;
    const remainingBalance = totalPurchases - totalPaid;
    return {
      customerId,
      customerName: r.customerName || '',
      totalPurchases,
      totalPaid,
      remainingBalance,
    };
  });
  return rows.filter((r) => r.remainingBalance !== 0 || r.totalPurchases > 0).sort((a, b) => b.remainingBalance - a.remainingBalance);
}

/** Customer Account Statement: sales, payments, remaining balance (for one customer). */
export async function getCustomerStatement(
  storeId: string,
  customerId: string,
  filters: ReportFilters
): Promise<{
  customerName: string;
  movements: Array<{ date: string; type: 'sale' | 'payment'; reference: string; amount: number; balance: number }>;
  remainingBalance: number;
}> {
  const Sale = await getSaleModelForStore(storeId);
  const CustomerPayment = getCustomerPaymentModelForStore(storeId);
  const Customer = await getCustomerModelForStore(storeId);
  const customer = await Customer.findOne({ storeId: storeId.toLowerCase(), _id: customerId }).lean();
  const customerName = (customer as any)?.name || '';

  const { match } = await getBaseMatch(storeId, filters);
  const salesMatch: any = { ...match, customerId, isReturn: { $ne: true } };
  const paymentQuery: any = { storeId: storeId.toLowerCase().trim(), customerId };
  if (match.date) paymentQuery.date = match.date;

  const sales = await Sale.find(salesMatch).sort({ date: 1 }).lean();
  const payments = await CustomerPayment.find(paymentQuery).sort({ date: 1 }).lean();

  const movements: Array<{ date: string; type: 'sale' | 'payment'; reference: string; amount: number; balance: number }> = [];
  let runningBalance = (customer as any)?.previousBalance ?? 0;

  const saleEntries = sales.map((s: any) => ({ date: s.date, type: 'sale' as const, reference: s.invoiceNumber, amount: s.total }));
  const paymentEntries = payments.map((p: any) => ({ date: p.date, type: 'payment' as const, reference: p.invoiceId || 'دفعة', amount: -(p.amount || 0) }));
  const all = [...saleEntries, ...paymentEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const e of all) {
    runningBalance += e.amount;
    movements.push({
      date: new Date(e.date).toISOString(),
      type: e.type,
      reference: e.reference,
      amount: e.amount,
      balance: runningBalance,
    });
  }

  return { customerName, movements, remainingBalance: runningBalance };
}

/** Best Selling Products. */
export async function getBestSellingProducts(
  storeId: string,
  filters: ReportFilters
): Promise<Array<{ productId: string; productName: string; quantitySold: number; totalSales: number }>> {
  const rows = await getSalesByProduct(storeId, filters);
  return rows.sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 100);
}

/** Least Selling Products. */
export async function getLeastSellingProducts(
  storeId: string,
  filters: ReportFilters
): Promise<Array<{ productId: string; productName: string; quantitySold: number; totalSales: number }>> {
  const rows = await getSalesByProduct(storeId, filters);
  return rows.sort((a, b) => a.quantitySold - b.quantitySold).slice(0, 100);
}

/** Products not sold within period: products with zero sales in the date range. */
export async function getProductsNotSold(
  storeId: string,
  filters: ReportFilters
): Promise<Array<{ productId: string; productName: string }>> {
  const Sale = await getSaleModelForStore(storeId);
  const Product = await getProductModelForStore(storeId);
  const normalizedStoreId = storeId.toLowerCase().trim();
  const { match } = await getBaseMatch(storeId, filters);

  const soldProductIds = await Sale.distinct('items.productId', { ...match, isReturn: { $ne: true } });
  const soldSet = new Set(soldProductIds.map(String));
  const allProducts = await Product.find({ storeId: normalizedStoreId }).select('_id name').lean();
  const notSold = allProducts.filter((p: any) => !soldSet.has(p._id.toString()));
  return notSold.map((p: any) => ({ productId: p._id.toString(), productName: p.name || '' }));
}

/** Current Stock Report. */
export async function getCurrentStockReport(
  storeId: string,
  filters: ReportFilters
): Promise<Array<{ productId: string; productName: string; availableQuantity: number; costPrice: number; totalInventoryValue: number }>> {
  const Product = await getProductModelForStore(storeId);
  const normalizedStoreId = storeId.toLowerCase().trim();
  const query: any = { storeId: normalizedStoreId };
  if (filters.productId) query._id = filters.productId;
  if (filters.categoryId) query.categoryId = filters.categoryId;

  const products = await Product.find(query).select('_id name stock costPrice').lean();
  return products.map((p: any) => ({
    productId: p._id.toString(),
    productName: p.name || '',
    availableQuantity: p.stock ?? 0,
    costPrice: p.costPrice ?? 0,
    totalInventoryValue: (p.stock ?? 0) * (p.costPrice ?? 0),
  }));
}

/** Low Stock Report: below minimum stock level (lowStockAlert). */
export async function getLowStockReport(
  storeId: string,
  filters: ReportFilters
): Promise<Array<{ productId: string; productName: string; availableQuantity: number; minStockLevel: number }>> {
  const Product = await getProductModelForStore(storeId);
  const normalizedStoreId = storeId.toLowerCase().trim();
  const query: any = { storeId: normalizedStoreId };
  if (filters.productId) query._id = filters.productId;

  const products = await Product.find(query).select('_id name stock lowStockAlert').lean();
  const low = products.filter((p: any) => (p.stock ?? 0) < (p.lowStockAlert ?? 0));
  return low.map((p: any) => ({
    productId: p._id.toString(),
    productName: p.name || '',
    availableQuantity: p.stock ?? 0,
    minStockLevel: p.lowStockAlert ?? 0,
  }));
}

/** Stock Movement: we don't have a separate movements table; we can show purchases + sales impact from Sale items. Simplified: purchases (from Purchase model if exists) and sales. */
export async function getStockMovementReport(
  storeId: string,
  filters: ReportFilters
): Promise<Array<{ productId: string; productName: string; purchases: number; sales: number; remainingQuantity: number }>> {
  const Sale = await getSaleModelForStore(storeId);
  const Product = await getProductModelForStore(storeId);
  const normalizedStoreId = storeId.toLowerCase().trim();
  const { match } = await getBaseMatch(storeId, filters);

  const salesByProduct = await Sale.aggregate([
    { $match: { ...match } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        salesQty: { $sum: '$items.quantity' }, // negative for returns
      },
    },
  ]);

  const productIds = salesByProduct.map((r: any) => r._id);
  const products = await Product.find({ storeId: normalizedStoreId, _id: { $in: productIds } }).select('_id name stock').lean();
  const stockMap = new Map(products.map((p: any) => [p._id.toString(), p.stock ?? 0]));

  return salesByProduct.map((r: any) => {
    const productId = String(r._id);
    const sales = -(r.salesQty ?? 0); // sold = positive number
    const remainingQuantity = stockMap.get(productId) ?? 0;
    return {
      productId,
      productName: r.productName || '',
      purchases: 0, // Would need Purchase model aggregation
      sales,
      remainingQuantity,
    };
  });
}

/** Daily Cash Report: total sales, total expenses (0 if no expense model), total profit. */
export async function getDailyCashReport(
  storeId: string,
  filters: ReportFilters
): Promise<{ totalSales: number; totalExpenses: number; totalProfit: number }> {
  const Sale = await getSaleModelForStore(storeId);
  const { match } = await getBaseMatch(storeId, filters);
  const salesMatch = { ...match, isReturn: { $ne: true } };

  const result = await Sale.aggregate([
    { $match: salesMatch },
    { $group: { _id: null, totalSales: { $sum: '$total' } } },
  ]);
  const totalSales = result[0]?.totalSales ?? 0;
  // No Expense model in codebase; use 0 for expenses
  const totalExpenses = 0;
  const totalProfit = totalSales - totalExpenses;
  return { totalSales, totalExpenses, totalProfit };
}

/** Discount Report: total discounts, per-invoice. */
export async function getDiscountReport(
  storeId: string,
  filters: ReportFilters
): Promise<{
  totalDiscounts: number;
  rows: Array<{ invoiceNumber: string; date: string; totalItemDiscount: number; invoiceDiscount: number; totalDiscount: number }>;
}> {
  const Sale = await getSaleModelForStore(storeId);
  const { match } = await getBaseMatch(storeId, filters);
  const salesMatch = { ...match, isReturn: { $ne: true } };

  const result = await Sale.aggregate([
    { $match: salesMatch },
    {
      $project: {
        invoiceNumber: 1,
        date: 1,
        totalItemDiscount: 1,
        invoiceDiscount: 1,
        totalDiscount: { $add: [{ $ifNull: ['$totalItemDiscount', 0] }, { $ifNull: ['$invoiceDiscount', 0] }] },
      },
    },
    { $sort: { date: -1 } },
    { $limit: 500 },
  ]);

  const rows = result.map((r: any) => ({
    invoiceNumber: r.invoiceNumber || '',
    date: r.date ? new Date(r.date).toISOString() : '',
    totalItemDiscount: r.totalItemDiscount ?? 0,
    invoiceDiscount: r.invoiceDiscount ?? 0,
    totalDiscount: r.totalDiscount ?? 0,
  }));
  const totalDiscounts = rows.reduce((sum, r) => sum + r.totalDiscount, 0);
  return { totalDiscounts, rows };
}

/** Returns Report. */
export async function getReturnsReport(
  storeId: string,
  filters: ReportFilters
): Promise<{ returnCount: number; totalReturnedAmount: number; rows: Array<{ invoiceNumber: string; date: string; total: number }> }> {
  const Sale = await getSaleModelForStore(storeId);
  const { match } = await getBaseMatch(storeId, filters);
  const returnsMatch = { ...match, isReturn: true };

  const result = await Sale.aggregate([
    { $match: returnsMatch },
    { $group: { _id: null, returnCount: { $sum: 1 }, totalReturnedAmount: { $sum: '$total' } } },
  ]);
  const list = await Sale.find(returnsMatch).select('invoiceNumber date total').sort({ date: -1 }).limit(200).lean();
  const returnCount = result[0]?.returnCount ?? 0;
  const totalReturnedAmount = Math.abs(result[0]?.totalReturnedAmount ?? 0);
  const rows = list.map((s: any) => ({
    invoiceNumber: s.invoiceNumber || '',
    date: s.date ? new Date(s.date).toISOString() : '',
    total: Math.abs(s.total ?? 0),
  }));
  return { returnCount, totalReturnedAmount, rows };
}
