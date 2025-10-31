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
      // In real implementation, this would call the API
      // await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, request);
      
      console.log('Password reset code sent to:', request.email);
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  static async resetPassword(request: ResetPasswordRequest): Promise<void> {
    try {
      // In real implementation, this would call the API
      // await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, request);
      
      console.log('Password reset successful for:', request.email);
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  static async verifyCode(email: string, code: string): Promise<boolean> {
    try {
      // In real implementation, this would call the API
      // const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_CODE, { email, code });
      // return response.data.verified;
      
      // Mock implementation - accept any 6-digit code
      return code.length === 6 && /^\d+$/.test(code);
    } catch (error) {
      console.error('Verify code error:', error);
      throw error;
    }
  }
}
