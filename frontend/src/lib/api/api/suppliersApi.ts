import { apiClient } from '../client';

export interface SupplierSummary {
  supplierId: string;
  supplierName: string;
  previousBalance: number;
  totalPurchases: number;
  totalPaid: number;
  balance: number;
  lastPaymentDate: string | null;
}

export const suppliersApi = {
  getSuppliers: (params?: { search?: string }) =>
    apiClient.get<{ success: boolean; data: { suppliers: any[] } }>('/suppliers', params),

  getSupplier: (id: string) =>
    apiClient.get<{ success: boolean; data: { supplier: any } }>(`/suppliers/${id}`),

  createSupplier: (supplier: {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    previousBalance?: number;
    notes?: string;
  }) =>
    apiClient.post<{ success: boolean; data: { supplier: any } }>('/suppliers', supplier),

  updateSupplier: (id: string, supplier: Partial<{
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    previousBalance: number;
    notes: string;
  }>) =>
    apiClient.put<{ success: boolean; data: { supplier: any } }>(`/suppliers/${id}`, supplier),

  deleteSupplier: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/suppliers/${id}`),

  getSupplierAccountsSummary: () =>
    apiClient.get<{ success: boolean; data: { summaries: SupplierSummary[] } }>('/suppliers/accounts/summary'),

  getSupplierPayments: (params?: { supplierId?: string }) =>
    apiClient.get<{ success: boolean; data: { payments: any[] } }>('/suppliers/payments', params),

  addSupplierPayment: (payment: {
    supplierId: string;
    amount: number; // positive = we pay (credit); negative = journal (debit)
    method: 'Cash' | 'Bank Transfer' | 'Cheque';
    date?: string;
    purchaseId?: string;
    notes?: string;
  }) =>
    apiClient.post<{ success: boolean; data: { payment: any } }>('/suppliers/payments', payment),

  updateSupplierPayment: (paymentId: string, payment: {
    amount?: number;
    method?: 'Cash' | 'Bank Transfer' | 'Cheque';
    date?: string;
    purchaseId?: string | null;
    notes?: string | null;
  }) =>
    apiClient.put<{ success: boolean; data: { payment: any } }>(`/suppliers/payments/${paymentId}`, payment),

  deleteSupplierPayment: (paymentId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/suppliers/payments/${paymentId}`),
};
