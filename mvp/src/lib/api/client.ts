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
      timeout: 10000,
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