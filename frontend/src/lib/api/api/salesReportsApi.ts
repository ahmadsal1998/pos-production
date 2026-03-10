import { apiClient } from '../client';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface ReportParams {
  startDate?: string;
  endDate?: string;
  productId?: string;
  customerId?: string;
  categoryId?: string;
  userId?: string;
  period?: ReportPeriod;
}

const base = '/sales/reports';

function get<T>(path: string, params?: ReportParams) {
  return apiClient.get<{ success: boolean; data: T }>(path, params as any).then((r: any) => (r.data?.data != null ? r.data.data : r.data));
}

export const salesReportsApi = {
  getSalesByPeriod: (params?: ReportParams) => get<{ rows: any[]; summary: any }>(`${base}/sales-by-period`, params),
  getSalesByProduct: (params?: ReportParams) => get<any[]>(`${base}/sales-by-product`, params),
  getSalesByCategory: (params?: ReportParams) => get<any[]>(`${base}/sales-by-category`, params),
  getSalesByPaymentMethod: (params?: ReportParams) => get<any[]>(`${base}/sales-by-payment-method`, params),
  getSalesByUser: (params?: ReportParams) => get<any[]>(`${base}/sales-by-user`, params),
  getProfitByPeriod: (params?: ReportParams) => get<any[]>(`${base}/profit-by-period`, params),
  getProfitByProduct: (params?: ReportParams) => get<any[]>(`${base}/profit-by-product`, params),
  getTopCustomers: (params?: ReportParams) => get<any[]>(`${base}/top-customers`, params),
  getCustomerDebtReport: (params?: ReportParams) => get<any[]>(`${base}/customer-debt`, params),
  getCustomerStatement: (params?: ReportParams) => get<{ customerName: string; movements: any[]; remainingBalance: number }>(`${base}/customer-statement`, params),
  getBestSellingProducts: (params?: ReportParams) => get<any[]>(`${base}/best-selling-products`, params),
  getLeastSellingProducts: (params?: ReportParams) => get<any[]>(`${base}/least-selling-products`, params),
  getProductsNotSold: (params?: ReportParams) => get<any[]>(`${base}/products-not-sold`, params),
  getCurrentStockReport: (params?: ReportParams) => get<any[]>(`${base}/current-stock`, params),
  getLowStockReport: (params?: ReportParams) => get<any[]>(`${base}/low-stock`, params),
  getStockMovementReport: (params?: ReportParams) => get<any[]>(`${base}/stock-movement`, params),
  getDailyCashReport: (params?: ReportParams) => get<{ totalSales: number; totalExpenses: number; totalProfit: number }>(`${base}/daily-cash`, params),
  getDiscountReport: (params?: ReportParams) => get<{ totalDiscounts: number; rows: any[] }>(`${base}/discounts`, params),
  getReturnsReport: (params?: ReportParams) => get<{ returnCount: number; totalReturnedAmount: number; rows: any[] }>(`${base}/returns`, params),
};
