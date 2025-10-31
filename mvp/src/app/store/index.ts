import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth types
export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
}

export interface LoginCredentials {
  emailOrUsername: string;
  password: string;
}

// Auth state interface
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setUser: (user: User) => void;
}

// Auth store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mock successful login
          const mockUser: User = {
            id: '1',
            email: credentials.emailOrUsername.includes('@') 
              ? credentials.emailOrUsername 
              : `${credentials.emailOrUsername}@pos.com`,
            username: credentials.emailOrUsername,
            role: 'admin',
            permissions: ['read', 'write', 'admin'],
          };

          set({ 
            user: mockUser, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false 
          });
        }
      },

      logout: () => {
        set({ 
          user: null, 
          isAuthenticated: false, 
          error: null 
        });
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