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

/** 403 codes handled centrally in the response interceptor (redirect / clear session). */
const CRITICAL_403_CODES: string[] = ['SUBSCRIPTION_EXPIRED'];

/**
 * Extract a user-friendly error message from an API error for display in the UI.
 * Prefer backend message (response.data.message or ApiError.message), fallback to generic.
 * Avoid showing raw stack or only "Error".
 */
export function getApiErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
  if (error == null) return fallback;
  const err = error as any;
  const data = err?.response?.data;
  if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    const parts = data.errors.map((e: any) => e?.msg ?? e?.message ?? String(e)).filter(Boolean);
    if (parts.length) return parts.join('\n');
  }
  if (err?.message && typeof err.message === 'string' && err.message !== 'Error') return err.message;
  if (data?.message) return data.message;
  if (err?.details?.message) return err.details.message;
  if (err?.details?.errors && Array.isArray(err.details.errors)) {
    const parts = err.details.errors.map((e: any) => e?.msg ?? e?.message ?? String(e)).filter(Boolean);
    if (parts.length) return parts.join('\n');
  }
  return fallback;
}

// API Client class
export class ApiClient {
  private client: AxiosInstance;
  private activeRequests: Map<string, { method: string; url: string; timestamp: number }> = new Map();
  private requestCounter: number = 0;

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

  /**
   * Check if there are any ongoing requests
   */
  hasActiveRequests(): boolean {
    return this.activeRequests.size > 0;
  }

  /**
   * Get the count of active requests
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Get all active request URLs (for debugging)
   */
  getActiveRequests(): string[] {
    return Array.from(this.activeRequests.values()).map(
      req => `${req.method} ${req.url}`
    );
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Generate unique request ID and track active request
        const requestId = `req_${++this.requestCounter}_${Date.now()}`;
        const method = config.method?.toUpperCase() || 'GET';
        const url = config.url || '';
        
        // Store request info with unique ID
        this.activeRequests.set(requestId, {
          method,
          url,
          timestamp: Date.now(),
        });
        
        // Store request ID in config metadata for later retrieval
        (config as any).__requestId = requestId;

        // Always read token fresh from localStorage for each request
        const token = localStorage.getItem('auth-token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          const isPaginationRequest = config.url?.includes('page=') || config.params?.page;
          if (isPaginationRequest && import.meta.env.DEV) {
            console.log('[API Client] Pagination request with token', {
              url: config.url,
              page: config.params?.page,
              hasToken: !!token,
              tokenLength: token.length,
            });
          }
        } else {
          if (config.url && !config.url.startsWith('/auth/')) {
            console.warn('[API Client] ⚠️ No auth token found in localStorage for request:', config.url);
            console.warn('[API Client] This request may fail with 401 Unauthorized');
          }
        }
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
        const requestId = (response.config as any).__requestId;
        if (requestId) {
          this.activeRequests.delete(requestId);
        }
        return response;
      },
      (error: AxiosError) => {
        const requestId = (error.config as any)?.__requestId;
        if (requestId) {
          this.activeRequests.delete(requestId);
        }
        const responseData = error.response?.data as any;
        const apiError: ApiError = {
          message: responseData?.message || error.message || 'An error occurred',
          status: error.response?.status || 500,
          code: responseData?.code ?? error.code,
          details: responseData,
        };

        if (error.response?.status === 401) {
          const requestUrl = error.config?.url || 'unknown';
          const isRefreshRequest = requestUrl.includes('/auth/refresh');
          const alreadyRetried = (error.config as any)?.__retried === true;

          const clearTokensAndRedirect = () => {
            localStorage.removeItem('auth-token');
            localStorage.removeItem('auth-refresh-token');
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              if (import.meta.env.DEV) console.log('[API Client] Redirecting to login after 401');
              window.location.href = '/login';
            }
          };

          if (isRefreshRequest || alreadyRetried) {
            clearTokensAndRedirect();
            return Promise.reject(apiError);
          }

          const refreshTokenValue = typeof localStorage !== 'undefined' ? localStorage.getItem('auth-refresh-token') : null;
          if (refreshTokenValue) {
            return (async () => {
              try {
                const { authApi } = await import('./api/authApi');
                const res = await authApi.refreshToken(refreshTokenValue);
                const resData = (res as any)?.data;
                const newToken = resData?.data?.token;
                const newRefreshToken = resData?.data?.refreshToken;
                if (newToken) {
                  localStorage.setItem('auth-token', newToken);
                  if (newRefreshToken) localStorage.setItem('auth-refresh-token', newRefreshToken);
                  (error.config as any).__retried = true;
                  return this.client.request(error.config!);
                }
              } catch (refreshErr) {
                if (import.meta.env.DEV) console.log('[API Client] Refresh failed, redirecting to login', refreshErr);
              }
              clearTokensAndRedirect();
              return Promise.reject(apiError);
            })();
          }

          clearTokensAndRedirect();
        }

        // Centralized handling for critical 403 codes (e.g. subscription expired)
        if (error.response?.status === 403 && responseData?.code && CRITICAL_403_CODES.includes(responseData.code)) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-token');
            localStorage.removeItem('auth-refresh-token');
            if (responseData.code === 'SUBSCRIPTION_EXPIRED') {
              window.location.href = '/subscription-expired';
            }
          }
        }

        return Promise.reject(apiError);
      }
    );
  }

  async get<T>(endpoint: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get(endpoint, { params });
      return {
        data: response.data as T,
        message: (response.data as any)?.message ?? 'Success',
        success: true,
        status: response.status,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        const fullUrl = error.config?.url || endpoint;
        const baseURL = this.client.defaults.baseURL;
        console.error('[API Client] 404 Error:', {
          endpoint,
          fullUrl,
          baseURL,
          resolvedURL: baseURL ? `${baseURL}${endpoint}` : endpoint,
          message: 'Route not found - check if VITE_API_URL is set correctly',
        });
        if (baseURL === '/api' && !import.meta.env.DEV) {
          console.error('[API Client] ⚠️ CRITICAL: VITE_API_URL is not set!');
          console.error('[API Client] Requests are going to frontend domain instead of backend');
          console.error('[API Client] Set VITE_API_URL environment variable to your backend URL (e.g., https://your-backend.onrender.com/api)');
        }
      }
      throw error;
    }
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
      const token = localStorage.getItem('auth-token');
      const config: any = {
        transformRequest: (data: any, headers: any) => {
          if (data instanceof FormData) {
            delete headers['Content-Type'];
          }
          return data;
        },
      };
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
      throw error;
    }
  }
}

// Single base URL helper - used by apiClient and re-exported for consumers that need it
export const getApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    if (import.meta.env.DEV) {
      console.log('[API Client] Using VITE_API_URL:', envUrl);
    }
    return envUrl;
  }
  if (import.meta.env.DEV) {
    console.log('[API Client] Development mode - using /api proxy');
    return '/api';
  }
  console.warn('[API Client] ⚠️ VITE_API_URL not set in production! Using /api (this will likely fail)');
  console.warn('[API Client] Please set VITE_API_URL environment variable to your backend URL');
  return '/api';
};

export const apiClient = new ApiClient(getApiBaseUrl());

// Re-export all API modules so imports from @/lib/api/client continue to work
export * from './api';
