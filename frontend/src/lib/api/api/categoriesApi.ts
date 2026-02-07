import { apiClient } from '../client';

export const categoriesApi = {
  getCategories: () =>
    apiClient.get<{ success: boolean; message: string; categories: any[] }>('/categories'),

  createCategory: (category: { name: string; description?: string }) =>
    apiClient.post<{ success: boolean; message: string; category: any }>('/categories', category),

  exportCategories: () => apiClient.download('/categories/export'),

  importCategories: (formData: FormData) =>
    apiClient.upload<{
      success: boolean;
      message: string;
      summary: { created: number; updated: number; failed: number };
      errors: Array<{ row: number; message: string }>;
      categories: any[];
    }>('/categories/import', formData),
};
