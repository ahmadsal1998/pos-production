import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { cleanupAllIndexedDB } from '../../lib/db/indexedDBCleanup';
import { productSync } from '../../lib/sync/productSync';

// Auth types
export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
  fullName?: string;
  storeId?: string | null; // null for system/admin users, string for store-specific users
}

export interface SubscriptionStatus {
  isActive: boolean;
  subscriptionExpired: boolean;
  subscriptionEndDate: Date | string;
}

export interface LoginCredentials {
  emailOrUsername: string;
  password: string;
}

// Auth state interface
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  setSubscriptionStatus: (status: SubscriptionStatus | null) => void;
  checkSubscriptionStatus: () => Promise<void>;
}

// Create axios instance
// Use VITE_API_URL from environment, fallback to '/api' for local development
const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || '/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      subscriptionStatus: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await api.post('/auth/login', credentials);
          const { user, token, subscriptionStatus } = response.data.data;

          // Store token in localStorage for API calls
          if (token) {
            localStorage.setItem('auth-token', token);
          }

          set({ 
            user, 
            token,
            isAuthenticated: true, 
            isLoading: false,
            error: null,
            subscriptionStatus: subscriptionStatus || null,
          });

          // Check if subscription is expired and redirect
          if (subscriptionStatus && (subscriptionStatus.subscriptionExpired || !subscriptionStatus.isActive)) {
            // Redirect to expired subscription page
            if (typeof window !== 'undefined') {
              window.location.href = '/subscription-expired';
            }
            return;
          }

          // CRITICAL: Sync ALL products to IndexedDB on login for store users
          // This ensures barcode scanning works instantly without API calls
          if (user?.storeId) {
            console.log('[Auth] Starting product sync to IndexedDB on login...');
            try {
              // Force full refresh to ensure all products are synced
              const syncResult = await productSync.syncProducts({ 
                forceRefresh: true 
              });
              
              if (syncResult.success) {
                console.log(`[Auth] ✅ Product sync completed: ${syncResult.syncedCount} products synced to IndexedDB`);
              } else {
                console.error(`[Auth] ⚠️ Product sync failed: ${syncResult.error}`);
                // Don't block login if sync fails, but log the error
                // The system will try to sync again when POS page loads
              }
            } catch (syncError) {
              console.error('[Auth] Error during product sync on login:', syncError);
              // Don't block login if sync fails - user can still use the system
              // Sync will retry when POS page loads
            }
          }
        } catch (error: any) {
          const errorData = error.response?.data || {};
          const errorMessage = errorData.message || 'Login failed. Please check your credentials.';
          
          set({ 
            error: errorMessage,
            isLoading: false 
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          // Clean up IndexedDB before logout
          try {
            await cleanupAllIndexedDB();
          } catch (cleanupError) {
            console.error('Error during IndexedDB cleanup:', cleanupError);
            // Continue with logout even if cleanup fails
          }

          // Clear token from localStorage
          localStorage.removeItem('auth-token');
          
          set({ 
            user: null, 
            token: null,
            isAuthenticated: false, 
            error: null,
            subscriptionStatus: null,
          });
        } catch (error) {
          // Even if logout fails, clear local state
          localStorage.removeItem('auth-token');
          set({ 
            user: null, 
            token: null,
            isAuthenticated: false, 
            error: null,
            subscriptionStatus: null,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      setSubscriptionStatus: (status: SubscriptionStatus | null) => {
        set({ subscriptionStatus: status });
      },

      checkSubscriptionStatus: async () => {
        try {
          const response = await api.get('/auth/me');
          const { subscriptionStatus } = response.data.data;
          
          set({ subscriptionStatus: subscriptionStatus || null });

          // Check if subscription is expired and redirect
          if (subscriptionStatus && (subscriptionStatus.subscriptionExpired || !subscriptionStatus.isActive)) {
            // Redirect to expired subscription page
            if (typeof window !== 'undefined') {
              window.location.href = '/subscription-expired';
            }
          }
        } catch (error: any) {
          // If we get a 403 with SUBSCRIPTION_EXPIRED code, treat as expired
          if (error.response?.status === 403 && error.response?.data?.code === 'SUBSCRIPTION_EXPIRED') {
            set({ 
              subscriptionStatus: {
                isActive: false,
                subscriptionExpired: true,
                subscriptionEndDate: error.response?.data?.subscriptionEndDate || new Date(),
              }
            });
            // Redirect to expired subscription page
            if (typeof window !== 'undefined') {
              window.location.href = '/subscription-expired';
            }
            return;
          }
          // If check fails for other reasons, don't block user (might be network issue)
          console.error('Failed to check subscription status:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        subscriptionStatus: state.subscriptionStatus,
      }),
    }
  )
);

// Theme state
export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme: Theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
    }),
    {
      name: 'theme-storage',
    }
  )
);

// Global app state
interface AppState {
  isMobileMenuOpen: boolean;
  isSidebarCollapsed: boolean;
  activePath: string;
  setMobileMenuOpen: (isOpen: boolean) => void;
  setSidebarCollapsed: (isCollapsed: boolean) => void;
  toggleSidebar: () => void;
  setActivePath: (path: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isMobileMenuOpen: false,
      isSidebarCollapsed: false,
      activePath: '/',
      setMobileMenuOpen: (isOpen: boolean) => set({ isMobileMenuOpen: isOpen }),
      setSidebarCollapsed: (isCollapsed: boolean) => set({ isSidebarCollapsed: isCollapsed }),
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setActivePath: (path: string) => set({ activePath: path }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
    }
  )
);