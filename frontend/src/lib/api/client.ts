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
        // Remove Content-Type header for FormData - axios will set it automatically with boundary
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
          delete config.headers.common?.['Content-Type'];
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
        const responseData = error.response?.data as any;
        const apiError: ApiError = {
          message: responseData?.message || error.message || 'An error occurred',
          status: error.response?.status || 500,
          code: error.code,
          details: responseData,
        };

        // Handle subscription expired error - redirect to expired subscription page
        if (error.response?.status === 403 && responseData?.code === 'SUBSCRIPTION_EXPIRED') {
          // Clear auth state
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-token');
            // Redirect to expired subscription page
            window.location.href = '/subscription-expired';
          }
        }

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
    try {
      // For FormData, we need to ensure axios sets Content-Type automatically with boundary
      const token = localStorage.getItem('auth-token');
      const config: any = {
        transformRequest: (data: any, headers: any) => {
          // Remove Content-Type to let axios set it automatically for FormData
          if (data instanceof FormData) {
            delete headers['Content-Type'];
          }
          return data;
        },
      };
      
      // Set headers manually
      if (token) {
        config.headers = {
          Authorization: `Bearer ${token}`,
        };
      }
      
      const response = await this.client.post(endpoint, data, config);
      return {
        data: response.data as T,
        message: (response.data as any)?.message ?? 'Success',
        success: true,
        status: response.status,
      };
    } catch (error: any) {
      // Re-throw to be handled by the caller
      throw error;
    }
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
  
  getContactNumber: () =>
    apiClient.get<{ success: boolean; data: { contactNumber: string } }>('/auth/contact-number'),
};

// Product metrics interface
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

// Products API endpoints
export interface ProductsPaginationResponse {
  success: boolean;
  message: string;
  products: any[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalProducts: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const productsApi = {
  getProducts: (params?: { page?: number; limit?: number; search?: string; showInQuickProducts?: boolean; status?: string }) =>
    apiClient.get<ProductsPaginationResponse>('/products', params),
  
  getProduct: (id: string) =>
    apiClient.get(`/products/${id}`),
  
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

// Sales API endpoints
export const salesApi = {
  getSales: (params?: any) =>
    apiClient.get('/sales', params),
  
  getNextInvoiceNumber: () =>
    apiClient.get<{ success: boolean; message: string; data: { invoiceNumber: string; number: number } }>('/sales/next-invoice-number'),
  
  createSale: (sale: any) =>
    apiClient.post('/sales', sale),
  
  getSale: (id: string) =>
    apiClient.get(`/sales/${id}`),
  
  updateSale: (id: string, sale: any) =>
    apiClient.put(`/sales/${id}`, sale),
  
  deleteSale: (id: string) =>
    apiClient.delete(`/sales/${id}`),
  
  processReturn: (returnData: {
    originalInvoiceId?: string; // Optional - for linking purposes
    returnItems: Array<{
      productId: string;
      quantity: number;
      unitPrice?: number;
      totalPrice?: number;
      productName?: string;
      unit?: string;
      discount?: number;
      conversionFactor?: number;
    }>;
    reason?: string;
    refundMethod?: 'cash' | 'card' | 'credit';
    seller?: string;
  }) =>
    apiClient.post('/sales/return', returnData),
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

// Customers API endpoints
export const customersApi = {
  getCustomers: () =>
    apiClient.get<{ success: boolean; message: string; data: { customers: any[] } }>('/customers'),
  
  getCustomer: (id: string) =>
    apiClient.get<{ success: boolean; message: string; data: { customer: any } }>(`/customers/${id}`),
  
  createCustomer: (customer: { name?: string; phone: string; address?: string; previousBalance?: number }) =>
    apiClient.post<{ success: boolean; message: string; data: { customer: any } }>('/customers', customer),
  
  // Customer payment endpoints
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

// Admin API endpoints
export const adminApi = {
  getStores: () =>
    apiClient.get<{ success: boolean; data: { stores: any[] } }>('/admin/stores'),
  
  getStore: (id: string) =>
    apiClient.get<{ success: boolean; data: { store: any } }>(`/admin/stores/${id}`),
  
  createStore: (store: { 
    name: string; 
    storeId: string; 
    prefix: string;
    subscriptionDuration?: '1month' | '2months' | '1year' | '2years';
    subscriptionEndDate?: string;
  }) =>
    apiClient.post<{ success: boolean; message: string; data: { store: any; defaultAdmin?: { id: string; username: string; email: string; fullName: string } | null } }>('/admin/stores', store),
  
  updateStore: (id: string, store: { 
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  }) =>
    apiClient.put<{ success: boolean; message: string; data: { store: any } }>(`/admin/stores/${id}`, store),
  
  deleteStore: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/admin/stores/${id}`),
  
  renewSubscription: (id: string, data: {
    subscriptionDuration?: '1month' | '2months' | '1year' | '2years';
    subscriptionEndDate?: string;
  }) =>
    apiClient.post<{ success: boolean; message: string; data: { store: any } }>(`/admin/stores/${id}/renew-subscription`, data),
  
  toggleStoreStatus: (id: string, isActive: boolean) =>
    apiClient.patch<{ success: boolean; message: string; data: { store: any } }>(`/admin/stores/${id}/status`, { isActive }),
  
  // Settings management (admin only)
  getSettings: () =>
    apiClient.get<{ success: boolean; data: { settings: Record<string, string>; settingsList: any[] } }>('/admin/settings'),
  
  getSetting: (key: string) =>
    apiClient.get<{ success: boolean; data: { setting: any } }>(`/admin/settings/${key}`),
  
  updateSetting: (key: string, data: { value: string; description?: string }) =>
    apiClient.put<{ success: boolean; message: string; data: { setting: any } }>(`/admin/settings/${key}`, data),
};

// Store Settings API endpoints (for store users)
export const storeSettingsApi = {
  getSettings: () =>
    apiClient.get<{ success: boolean; data: { settings: Record<string, string>; settingsList: any[] } }>('/settings'),
  
  getSetting: (key: string) =>
    apiClient.get<{ success: boolean; data: { setting: any } }>(`/settings/${key}`),
  
  updateSetting: (key: string, data: { value: string; description?: string }) =>
    apiClient.put<{ success: boolean; message: string; data: { setting: any } }>(`/settings/${key}`, data),
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
