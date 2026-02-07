import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api/client';
import { cleanupAllIndexedDB } from '../../lib/db/indexedDBCleanup';
import { runSyncOnLogin } from '../../lib/sync/runSyncOnLogin';
import { clearAllProductsCaches } from '@/lib/cache/productsCache';

// Auth types
export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
  fullName?: string;
  storeId?: string | null; // null for system/admin users, string for store-specific users
  storeTypeName?: string | null; // Store type name (e.g., "Other", "Restaurant", "Supermarket")
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

/** Last sync result (products + customers) for UI (e.g. "data may be outdated" + retry). */
export interface LastSyncResult {
  success: boolean;
  productError?: string;
  customerError?: string;
  productsSynced: number;
  customersSynced: number;
}

// Auth state interface
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  /** Set after login sync (or manual retry); used to show "sync failed" banner and retry. */
  lastSyncResult: LastSyncResult | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  setSubscriptionStatus: (status: SubscriptionStatus | null) => void;
  checkSubscriptionStatus: () => Promise<void>;
  /** Sync token from localStorage (single source of truth) after rehydration. */
  syncTokenFromStorage: () => void;
  /** Retry store data sync (products + customers); updates lastSyncResult. */
  retrySync: () => Promise<LastSyncResult | null>;
  /** Clear last sync result (e.g. after user dismisses banner). */
  clearLastSyncResult: () => void;
}

// Auth store - uses single apiClient (authApi) so login gets same interceptors (401, request ID, etc.)
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      subscriptionStatus: null,
      lastSyncResult: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.login(credentials);
          const { user, token, refreshToken, subscriptionStatus } = response.data.data;

          // Single source of truth for API: token and refreshToken in localStorage (API client reads from here)
          if (token) localStorage.setItem('auth-token', token);
          if (refreshToken) localStorage.setItem('auth-refresh-token', refreshToken);

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

          // CRITICAL: Sync products and customers via single sync layer (no duplicate sync logic in auth store)
          if (user?.storeId) {
            try {
              const syncResult = await runSyncOnLogin(user.storeId);
              set({
                lastSyncResult: {
                  success: syncResult.success,
                  productError: syncResult.productError,
                  customerError: syncResult.customerError,
                  productsSynced: syncResult.productsSynced,
                  customersSynced: syncResult.customersSynced,
                },
              });
              if (syncResult.success) {
                console.log(`[Auth] ✅ Sync completed: ${syncResult.productsSynced} products, ${syncResult.customersSynced} customers`);
              } else {
                if (syncResult.productError) console.error('[Auth] ⚠️ Product sync failed:', syncResult.productError);
                if (syncResult.customerError) console.error('[Auth] ⚠️ Customer sync failed:', syncResult.customerError);
              }
            } catch (syncError) {
              console.error('[Auth] Error during sync on login:', syncError);
              set({
                lastSyncResult: {
                  success: false,
                  productError: (syncError as Error)?.message ?? 'Sync failed',
                  customersSynced: 0,
                  productsSynced: 0,
                },
              });
            }
          }
        } catch (error: any) {
          // authApi uses apiClient; errors are ApiError shape (message, status, details)
          const errorMessage = error?.message ?? error?.details?.message ?? 'Login failed. Please check your credentials.';
          set({ 
            error: errorMessage,
            isLoading: false 
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          // Notify backend so it can invalidate refresh tokens (token still in localStorage for this request)
          try {
            await authApi.logout();
          } catch (logoutApiError) {
            // Ignore: network/401/etc.; always clear local state
          }

          // Clean up IndexedDB
          try {
            await cleanupAllIndexedDB();
          } catch (cleanupError) {
            console.error('Error during IndexedDB cleanup:', cleanupError);
          }

          clearAllProductsCaches();
          localStorage.removeItem('auth-token');
          localStorage.removeItem('auth-refresh-token');

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
            subscriptionStatus: null,
            lastSyncResult: null,
          });
        } catch (error) {
          localStorage.removeItem('auth-token');
          localStorage.removeItem('auth-refresh-token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
            subscriptionStatus: null,
            lastSyncResult: null,
          });
        }
      },

      retrySync: async (): Promise<LastSyncResult | null> => {
        const user = get().user;
        const storeId = user?.storeId;
        if (!storeId) return null;
        try {
          const syncResult = await runSyncOnLogin(storeId);
          const result: LastSyncResult = {
            success: syncResult.success,
            productError: syncResult.productError,
            customerError: syncResult.customerError,
            productsSynced: syncResult.productsSynced,
            customersSynced: syncResult.customersSynced,
          };
          set({ lastSyncResult: result });
          return result;
        } catch (e: any) {
          const result: LastSyncResult = {
            success: false,
            productError: e?.message ?? 'Sync failed',
            productsSynced: 0,
            customersSynced: 0,
          };
          set({ lastSyncResult: result });
          return result;
        }
      },

      clearLastSyncResult: () => set({ lastSyncResult: null }),

      clearError: () => {
        set({ error: null });
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      setSubscriptionStatus: (status: SubscriptionStatus | null) => {
        set({ subscriptionStatus: status });
      },

      syncTokenFromStorage: () => {
        if (typeof localStorage === 'undefined') return;
        const token = localStorage.getItem('auth-token');
        set({ token });
        if (!token) set({ isAuthenticated: false, user: null });
      },

      checkSubscriptionStatus: async () => {
        try {
          const response = await authApi.getMe();
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
          // If we get a 403 with SUBSCRIPTION_EXPIRED code, treat as expired (apiClient rejects with ApiError)
          if (error?.status === 403 && error?.code === 'SUBSCRIPTION_EXPIRED') {
            set({ 
              subscriptionStatus: {
                isActive: false,
                subscriptionExpired: true,
                subscriptionEndDate: error?.details?.subscriptionEndDate || new Date(),
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
        user: state.user ? {
          ...state.user,
          storeTypeName: state.user.storeTypeName,
        } : null,
        isAuthenticated: state.isAuthenticated,
        subscriptionStatus: state.subscriptionStatus,
        // lastSyncResult not persisted so banner shows only for current session after failed sync
      }),
      onRehydrateStorage: () => (state) => {
        if (typeof window !== 'undefined') {
          setTimeout(() => useAuthStore.getState().syncTokenFromStorage(), 0);
        }
      },
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