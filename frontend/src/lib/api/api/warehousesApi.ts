import { apiClient } from '../client';

export const warehousesApi = {
  getWarehouses: () =>
    apiClient.get<{ success: boolean; message: string; warehouses: any[] }>('/warehouses'),

  getWarehouse: (id: string) =>
    apiClient.get<{ success: boolean; message: string; warehouse: any }>(`/warehouses/${id}`),

  createWarehouse: (warehouse: { name: string; description?: string; address?: string; status?: 'Active' | 'Inactive' }) =>
    apiClient.post<{ success: boolean; message: string; warehouse: any }>('/warehouses', warehouse),

  updateWarehouse: (id: string, warehouse: { name?: string; description?: string; address?: string; status?: 'Active' | 'Inactive' }) =>
    apiClient.put<{ success: boolean; message: string; warehouse: any }>(`/warehouses/${id}`, warehouse),

  deleteWarehouse: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/warehouses/${id}`),

  exportWarehouses: () => apiClient.download('/warehouses/export'),

  importWarehouses: (formData: FormData) =>
    apiClient.upload<{
      success: boolean;
      message: string;
      summary: { created: number; updated: number; failed: number };
      errors: Array<{ row: number; message: string }>;
      warehouses: any[];
    }>('/warehouses/import', formData),
};
