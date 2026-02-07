import { apiClient } from '../client';

export interface CustomersListResponse {
  success: boolean;
  message: string;
  data: {
    items: any[];
    customers: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage?: boolean; hasPreviousPage?: boolean };
  };
}

export const customersApi = {
  getCustomers: (params?: { search?: string; page?: number; limit?: number; light?: boolean }) =>
    apiClient.get<CustomersListResponse>('/customers', params),

  getCustomer: (id: string) =>
    apiClient.get<{ success: boolean; message: string; data: { customer: any } }>(`/customers/${id}`),

  createCustomer: (customer: { name?: string; phone: string; address?: string; previousBalance?: number }) =>
    apiClient.post<{ success: boolean; message: string; data: { customer: any } }>('/customers', customer),

  updateCustomer: (id: string, customer: { name?: string; phone?: string; address?: string; previousBalance?: number }) =>
    apiClient.put<{ success: boolean; message: string; data: { customer: any } }>(`/customers/${id}`, customer),

  deleteCustomer: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/customers/${id}`),

  getCustomerAccountsSummary: (params?: { _t?: number }) =>
    apiClient.get<{ success: boolean; message: string; data: { summaries: any[] } }>('/customers/accounts/summary', params),

  getCustomerPayments: (params?: { customerId?: string }) =>
    apiClient.get<{ success: boolean; message: string; data: { payments: any[] } }>('/customers/payments/list', params),

  createCustomerPayment: (payment: {
    customerId: string;
    amount: number;
    method: 'Cash' | 'Bank Transfer' | 'Cheque';
    date?: string;
    invoiceId?: string;
    notes?: string;
  }) =>
    apiClient.post<{ success: boolean; message: string; data: { payment: any } }>('/customers/payments', payment),

  updateCustomerPayment: (paymentId: string, payment: {
    amount?: number;
    method?: 'Cash' | 'Bank Transfer' | 'Cheque';
    date?: string;
    invoiceId?: string | null;
    notes?: string | null;
  }) =>
    apiClient.put<{ success: boolean; message: string; data: { payment: any } }>(`/customers/payments/${paymentId}`, payment),

  deleteCustomerPayment: (paymentId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/customers/payments/${paymentId}`),
};
