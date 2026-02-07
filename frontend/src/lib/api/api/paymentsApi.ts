import { apiClient } from '../client';

export interface ProcessPaymentRequest {
  invoiceId: string;
  amount: number;
  currency?: string;
  paymentMethod: 'Cash' | 'Card' | 'Credit';
  description?: string;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data: {
    payment: {
      id: string;
      invoiceId: string;
      amount: number;
      currency: string;
      paymentMethod: string;
      status: 'Pending' | 'Approved' | 'Declined' | 'Error' | 'Cancelled';
      transactionId?: string;
      authorizationCode?: string;
      processedAt?: string;
    };
  };
}

export const paymentsApi = {
  processPayment: (request: ProcessPaymentRequest) =>
    apiClient.post<PaymentResponse>('/payments/process', request),

  getPayment: (id: string) =>
    apiClient.get<{ success: boolean; data: { payment: any } }>(`/payments/${id}`),

  getPaymentsByInvoice: (invoiceId: string) =>
    apiClient.get<{ success: boolean; data: { payments: any[] } }>(`/payments/invoice/${invoiceId}`),

  cancelPayment: (id: string) =>
    apiClient.post<{ success: boolean; message: string; data: { payment: any } }>(`/payments/${id}/cancel`),
};
