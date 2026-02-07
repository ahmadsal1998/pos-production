import { apiClient } from '../client';
import type { ApiResponse } from '../client';

export const salesApi = {
  getSales: (params?: any) =>
    apiClient.get('/sales', params),

  getSalesSummary: (params?: any) =>
    apiClient.get<{ success: boolean; message: string; data: { totalSales: number; totalPayments: number; invoiceCount: number; creditSales: number; remainingAmount: number; netProfit: number } }>('/sales/summary', params),

  getCurrentInvoiceNumber: () =>
    apiClient.get<ApiResponse<{ invoiceNumber: string; number: number }>>('/sales/current-invoice-number'),
  getNextInvoiceNumber: () =>
    apiClient.get<{ success: boolean; message: string; data: { invoiceNumber: string; number: number } }>('/sales/next-invoice-number'),

  createSale: (sale: any) =>
    apiClient.post('/sales', sale),

  createSimpleSale: (data: { invoiceAmount: number; customerNumber?: string }) =>
    apiClient.post<{ success: boolean; message: string; data: { sale: any } }>('/sales/simple', data),

  getSale: (id: string) =>
    apiClient.get(`/sales/${id}`),

  updateSale: (id: string, sale: any) =>
    apiClient.put(`/sales/${id}`, sale),

  deleteSale: (id: string) =>
    apiClient.delete(`/sales/${id}`),

  processReturn: (returnData: {
    originalInvoiceId?: string;
    returnItems: Array<{
      productId: string;
      quantity: number;
      unitPrice?: number;
      totalPrice?: number;
      productName?: string;
      unit?: string;
      discount?: number;
      conversionFactor?: number;
    }>;
    reason?: string;
    refundMethod?: 'cash' | 'card' | 'credit';
    seller?: string;
  }) =>
    apiClient.post('/sales/return', returnData),
};
