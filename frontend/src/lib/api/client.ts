import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// API Response types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  status: number;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

// API Client class
export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = '/api') {
    this.client = axios.create({
      baseURL,
      timeout: 30000, // Increased to 30s for Render cold starts
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth-token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Pass through the raw Axios response. We'll shape it in the methods
        return response;
      },
      (error: AxiosError) => {
        const apiError: ApiError = {
          message: (error.response?.data as any)?.message || error.message || 'An error occurred',
          status: error.response?.status || 500,
          code: error.code,
          details: error.response?.data,
        };
        return Promise.reject(apiError);
      }
    );
  }

  async get<T>(endpoint: string, params?: any): Promise<ApiResponse<T>> {
    const response = await this.client.get(endpoint, { params });
    return {
      data: response.data as T,
      message: (response.data as any)?.message ?? 'Success',
      success: true,
      status: response.status,
    };
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post(endpoint, data);
    return {
      data: response.data as T,
      message: (response.data as any)?.message ?? 'Success',
      success: true,
      status: response.status,
    };
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put(endpoint, data);
    return {
      data: response.data as T,
      message: (response.data as any)?.message ?? 'Success',
      success: true,
      status: response.status,
    };
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.patch(endpoint, data);
    return {
      data: response.data as T,
      message: (response.data as any)?.message ?? 'Success',
      success: true,
      status: response.status,
    };
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete(endpoint);
    return {
      data: response.data as T,
      message: (response.data as any)?.message ?? 'Success',
      success: true,
      status: response.status,
    };
  }
  async download(endpoint: string, params?: any): Promise<Blob> {
    const response = await this.client.get(endpoint, {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  async upload<T>(endpoint: string, data: FormData): Promise<ApiResponse<T>> {
    const response = await this.client.post(endpoint, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return {
      data: response.data as T,
      message: (response.data as any)?.message ?? 'Success',
      success: true,
      status: response.status,
    };
  }
}

// Create default instance
export const apiClient = new ApiClient((import.meta as any).env?.VITE_API_URL || '/api');

// Auth API endpoints
export const authApi = {
  login: (credentials: { emailOrUsername: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
  
  logout: () =>
    apiClient.post('/auth/logout'),
  
  refreshToken: () =>
    apiClient.post('/auth/refresh'),
  
  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),
  
  verifyEmail: (token: string) =>
    apiClient.post('/auth/verify-email', { token }),
};

// Products API endpoints
export const productsApi = {
  getProducts: (params?: any) =>
    apiClient.get('/products', params),
  
  getProduct: (id: string) =>
    apiClient.get(`/products/${id}`),
  
  createProduct: (product: any) =>
    apiClient.post('/products', product),
  
  updateProduct: (id: string, product: any) =>
    apiClient.put(`/products/${id}`, product),
  
  deleteProduct: (id: string) =>
    apiClient.delete(`/products/${id}`),
};

// Sales API endpoints
export const salesApi = {
  getSales: (params?: any) =>
    apiClient.get('/sales', params),
  
  createSale: (sale: any) =>
    apiClient.post('/sales', sale),
  
  getSale: (id: string) =>
    apiClient.get(`/sales/${id}`),
  
  updateSale: (id: string, sale: any) =>
    apiClient.put(`/sales/${id}`, sale),
  
  deleteSale: (id: string) =>
    apiClient.delete(`/sales/${id}`),
};

// Dashboard API endpoints
export const dashboardApi = {
  getMetrics: () =>
    apiClient.get('/dashboard/metrics'),
  
  getSalesData: (period: string) =>
    apiClient.get('/dashboard/sales', { period }),
  
  getProductPerformance: () =>
    apiClient.get('/dashboard/products/performance'),
};

// Users API endpoints
export const usersApi = {
  getUsers: () =>
    apiClient.get<{ success: boolean; data: { users: any[] } }>('/users'),
  
  getUser: (id: string) =>
    apiClient.get<{ success: boolean; data: { user: any } }>(`/users/${id}`),
  
  createUser: (user: any) =>
    apiClient.post<{ success: boolean; data: { user: any } }>('/users', user),
  
  updateUser: (id: string, user: any) =>
    apiClient.put<{ success: boolean; data: { user: any } }>(`/users/${id}`, user),
  
  deleteUser: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/users/${id}`),
};

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

// Admin API endpoints
export const adminApi = {
  getStores: () =>
    apiClient.get<{ success: boolean; data: { stores: any[] } }>('/admin/stores'),
  
  getStore: (id: string) =>
    apiClient.get<{ success: boolean; data: { store: any } }>(`/admin/stores/${id}`),
  
  createStore: (store: { name: string; storeId: string; prefix: string }) =>
    apiClient.post<{ success: boolean; message: string; data: { store: any } }>('/admin/stores', store),
  
  updateStore: (id: string, store: { name: string }) =>
    apiClient.put<{ success: boolean; message: string; data: { store: any } }>(`/admin/stores/${id}`, store),
  
  deleteStore: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/admin/stores/${id}`),
};

// Payment API endpoints
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

// Merchants API endpoints
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
