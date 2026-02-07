import { apiClient } from '../client';

export const brandsApi = {
  getBrands: () =>
    apiClient.get<{ success: boolean; message: string; brands: any[] }>('/brands'),

  createBrand: (brand: { name: string; description?: string }) =>
    apiClient.post<{ success: boolean; message: string; brand: any }>('/brands', brand),

  exportBrands: () => apiClient.download('/brands/export'),

  importBrands: (formData: FormData) =>
    apiClient.upload<{
      success: boolean;
      message: string;
      summary: { created: number; updated: number; failed: number };
      errors: Array<{ row: number; message: string }>;
      brands: any[];
    }>('/brands/import', formData),
};
