// Auth-specific custom hooks
import { useState, useEffect } from 'react';
import { AuthService, LoginCredentials, ForgotPasswordRequest, ResetPasswordRequest } from '../services';

export const useAuth = () => {
  const [user, setUser] = useState<any | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth state
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await AuthService.login(credentials);
      setUser(response.user);
      setIsAuthenticated(true);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await AuthService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
};

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await AuthService.login(credentials);
      return response;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
};

export const useForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sendCode = async (request: ForgotPasswordRequest) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      await AuthService.forgotPassword(request);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { sendCode, isLoading, error, success };
};

export const useResetPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetPassword = async (request: ResetPasswordRequest) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      await AuthService.resetPassword(request);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { resetPassword, isLoading, error, success };
};
