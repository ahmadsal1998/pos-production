import { apiClient } from '../client';

export interface Merchant {
  id: string;
  name: string;
  merchantId: string;
  storeId?: string;
  status: 'Active' | 'Inactive';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const merchantsApi = {
  getMerchants: () =>
    apiClient.get<{ success: boolean; data: { merchants: Merchant[] } }>('/merchants'),

  getMerchant: (id: string) =>
    apiClient.get<{ success: boolean; data: { merchant: Merchant; terminals: any[] } }>(`/merchants/${id}`),

  createMerchant: (merchant: {
    name: string;
    merchantId: string;
    storeId?: string;
    description?: string;
    status?: 'Active' | 'Inactive';
  }) =>
    apiClient.post<{ success: boolean; message: string; data: { merchant: Merchant } }>('/merchants', merchant),

  updateMerchant: (id: string, merchant: {
    name?: string;
    merchantId?: string;
    description?: string;
    status?: 'Active' | 'Inactive';
  }) =>
    apiClient.put<{ success: boolean; message: string; data: { merchant: Merchant } }>(`/merchants/${id}`, merchant),

  deleteMerchant: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/merchants/${id}`),
};
