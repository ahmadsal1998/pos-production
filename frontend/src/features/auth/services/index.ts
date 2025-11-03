// Auth-specific services
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // In real implementation, this would call the API
      // const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      // return response.data;
      
      // Mock implementation for now
      if (credentials.email === 'admin@example.com' && credentials.password === 'password') {
        return {
          token: 'mock-token',
          user: {
            id: '1',
            email: credentials.email,
            name: 'Admin User',
            role: 'admin',
          },
        };
      }
      throw new Error('Invalid credentials');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      // In real implementation, this would call the API
      // await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  static async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
    try {
      // apiClient.post returns { data: backendResponse, message, success, status }
      // The backend response structure is: { success: true, message: "OTP sent successfully" }
      const response = await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, request);
      
      // response.data contains the backend response: { success, message }
      const backendResponse = response.data as { success: boolean; message?: string };
      
      // Backend always returns success for security (doesn't reveal if email exists)
      // So if we get here, the request was successful
      if (backendResponse && backendResponse.success) {
        console.log('Password reset code sent to:', request.email);
        return;
      }
      
      throw new Error(backendResponse?.message || 'Failed to send OTP');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      // Handle different error formats from ApiError
      const errorMessage = 
        error.message || 
        error.response?.data?.message || 
        error.data?.message || 
        'Failed to send OTP code';
      
      throw new Error(errorMessage);
    }
  }

  static async resetPassword(request: ResetPasswordRequest): Promise<void> {
    try {
      // Backend expects: { email, newPassword }
      const payload = {
        email: request.email,
        newPassword: request.newPassword,
      };
      
      const response = await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, payload);
      
      // apiClient.post returns { data: backendResponse, message, success, status }
      const backendResponse = response.data as { success: boolean; message?: string };
      
      if (backendResponse && backendResponse.success) {
        console.log('Password reset successful for:', request.email);
        return;
      }
      
      throw new Error(backendResponse?.message || 'Password reset failed');
    } catch (error: any) {
      console.error('Reset password error:', error);
      
      // Handle different error formats
      const errorMessage = 
        error.message || 
        error.response?.data?.message || 
        error.data?.message || 
        'Failed to reset password';
      
      throw new Error(errorMessage);
    }
  }

  static async verifyCode(email: string, code: string): Promise<boolean> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_OTP, { email, code });
      
      // apiClient.post returns { data: backendResponse, message, success, status }
      const backendResponse = response.data as { success: boolean; message?: string };
      
      if (backendResponse && backendResponse.success) {
        return true;
      }
      
      throw new Error(backendResponse?.message || 'OTP verification failed');
    } catch (error: any) {
      console.error('Verify code error:', error);
      
      // Handle different error formats
      const errorMessage = 
        error.message || 
        error.response?.data?.message || 
        error.data?.message || 
        'OTP verification failed';
      
      throw new Error(errorMessage);
    }
  }
}
