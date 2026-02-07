import { apiClient } from '../client';

export const unitsApi = {
  getUnits: () =>
    apiClient.get<{ success: boolean; message: string; units: any[] }>('/units'),

  getUnit: (id: string) =>
    apiClient.get<{ success: boolean; message: string; unit: any }>(`/units/${id}`),

  createUnit: (unit: { name: string; description?: string }) =>
    apiClient.post<{ success: boolean; message: string; unit: any }>('/units', unit),

  updateUnit: (id: string, unit: { name?: string; description?: string }) =>
    apiClient.put<{ success: boolean; message: string; unit: any }>(`/units/${id}`, unit),

  deleteUnit: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/units/${id}`),

  exportUnits: () => apiClient.download('/units/export'),

  importUnits: (formData: FormData) =>
    apiClient.upload<{
      success: boolean;
      message: string;
      summary: { created: number; updated: number; failed: number };
      errors: Array<{ row: number; message: string }>;
      units: any[];
    }>('/units/import', formData),
};
