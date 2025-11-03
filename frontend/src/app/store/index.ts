import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

// Auth types
export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
  fullName?: string;
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
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setUser: (user: User) => void;
}

// Create axios instance
const api = axios.create({
  baseURL: '/api',
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

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await api.post('/auth/login', credentials);
          const { user, token } = response.data.data;

          // Store token in localStorage for API calls
          if (token) {
            localStorage.setItem('auth-token', token);
          }

          set({ 
            user, 
            token,
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
          set({ 
            error: errorMessage,
            isLoading: false 
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          // Clear token from localStorage
          localStorage.removeItem('auth-token');
          
          set({ 
            user: null, 
            token: null,
            isAuthenticated: false, 
            error: null 
          });
        } catch (error) {
          // Even if logout fails, clear local state
          localStorage.removeItem('auth-token');
          set({ 
            user: null, 
            token: null,
            isAuthenticated: false, 
            error: null 
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        isAuthenticated: state.isAuthenticated 
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