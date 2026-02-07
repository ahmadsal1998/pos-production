import { apiClient } from '../client';

export interface ProductMetrics {
  totalValue: number;
  totalCostValue: number;
  totalSellingValue: number;
  averageProfitMargin: number;
  overallProfitMargin: number;
  lowStockCount: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    stock: number;
    lowStockAlert: number;
    unit: string;
  }>;
  totalProducts: number;
  productsWithStock: number;
}

export interface ProductsPaginationResponse {
  success: boolean;
  message: string;
  products: any[];
  /** Use totalPages / hasNextPage for list consumers; do not assume all items in one response. */
  pagination?: {
    page: number;
    currentPage: number;
    totalPages: number;
    totalProducts: number;
    total?: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const productsApi = {
  getProducts: (params?: { page?: number; limit?: number; search?: string; showInQuickProducts?: boolean; status?: string; all?: boolean; includeCategories?: boolean; modifiedSince?: string; view?: 'list' | 'detail' }) =>
    apiClient.get<ProductsPaginationResponse>('/products', params),

  getProduct: (id: string) =>
    apiClient.get(`/products/${id}`),

  getProductByBarcode: (barcode: string) =>
    apiClient.get<{ success: boolean; message: string; data: { product: any; matchedUnit: any; matchedBarcode: string } }>(`/products/barcode/${encodeURIComponent(barcode)}`),

  getProductMetrics: () =>
    apiClient.get<{ success: boolean; message: string; data: ProductMetrics }>('/products/metrics'),

  createProduct: (product: any) =>
    apiClient.post('/products', product),

  updateProduct: (id: string, product: any) =>
    apiClient.put(`/products/${id}`, product),

  deleteProduct: (id: string) =>
    apiClient.delete(`/products/${id}`),

  importProducts: (formData: FormData) =>
    apiClient.upload<{
      success: boolean;
      message: string;
      summary: {
        totalRows: number;
        validProducts: number;
        imported: number;
        skipped: number;
        duplicates: number;
        errors?: string[];
      };
      data: {
        imported: number;
        skipped: number;
        duplicates: number;
      };
    }>('/products/import', formData),
};
