import { apiClient } from '../client';

/** Backend login response body: { data: { user, token, refreshToken?, subscriptionStatus } } */
export interface LoginResponseData {
  data: { user: any; token: string; refreshToken?: string; subscriptionStatus?: any };
}

/** Backend /auth/me response body: { data: { user, subscriptionStatus } } */
export interface GetMeResponseData {
  data: { user: any; subscriptionStatus?: any };
}

export const authApi = {
  login: (credentials: { emailOrUsername: string; password: string }) =>
    apiClient.post<LoginResponseData>('/auth/login', credentials),

  logout: () =>
    apiClient.post('/auth/logout'),

  /** Send refresh token in body; token read from storage by interceptor when needed. */
  refreshToken: (refreshToken?: string) => {
    const rt = refreshToken ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('auth-refresh-token') : null);
    return apiClient.post<{ success: boolean; data: { token: string; refreshToken: string } }>('/auth/refresh', { refreshToken: rt || '' });
  },

  getMe: () =>
    apiClient.get<GetMeResponseData>('/auth/me'),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),

  verifyEmail: (token: string) =>
    apiClient.post('/auth/verify-email', { token }),

  getContactNumber: () =>
    apiClient.get<{ success: boolean; data: { contactNumber: string } }>('/auth/contact-number'),
};
