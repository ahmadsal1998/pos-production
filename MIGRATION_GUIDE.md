# Migration Guide: Current to Improved Architecture

## Overview
This guide will help you migrate from your current architecture to the improved, more scalable structure. The migration should be done incrementally to minimize disruption.

## Phase 1: Core Infrastructure Setup

### Step 1: Create Core Directory Structure
```bash
mkdir -p src/core/{api,constants,hooks,services,store,utils}
mkdir -p src/app
mkdir -p src/styles
```

### Step 2: Move and Reorganize Constants
**Current**: `src/shared/constants/`
**New**: `src/core/constants/`

```bash
# Move existing constants
mv src/shared/constants/* src/core/constants/
```

**Update imports**:
```typescript
// Before
import { NAV_ITEMS } from '../shared/constants/routes';

// After  
import { NAV_ITEMS } from '../core/constants/routes';
```

### Step 3: Create API Layer
Create `src/core/api/client.ts`:
```typescript
// HTTP client configuration
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
});

// Add interceptors for auth, error handling, etc.
export default apiClient;
```

Create `src/core/api/endpoints.ts`:
```typescript
// Centralized API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  PRODUCTS: {
    LIST: '/products',
    CREATE: '/products',
    UPDATE: '/products/:id',
    DELETE: '/products/:id',
  },
  // ... other endpoints
} as const;
```

## Phase 2: Feature Migration

### Step 4: Migrate Auth Feature
**Current**: `src/features/auth/`
**New**: Enhanced structure with proper separation

1. **Create feature-specific services**:
```bash
mkdir -p src/features/auth/services
```

Create `src/features/auth/services/auth.service.ts`:
```typescript
import apiClient from '../../../core/api/client';
import { API_ENDPOINTS } from '../../../core/api/endpoints';

export class AuthService {
  static async login(credentials: LoginCredentials) {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    return response.data;
  }
  
  static async logout() {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  }
  
  // ... other auth methods
}
```

2. **Create feature-specific hooks**:
```bash
mkdir -p src/features/auth/hooks
```

Create `src/features/auth/hooks/useLogin.ts`:
```typescript
import { useState } from 'react';
import { AuthService } from '../services/auth.service';

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await AuthService.login(credentials);
      // Handle success
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
};
```

3. **Update component structure**:
```bash
# Reorganize components with proper structure
mkdir -p src/features/auth/components/LoginForm
mv src/features/auth/components/LoginForm/LoginForm.tsx src/features/auth/components/LoginForm/
```

Update `src/features/auth/components/LoginForm/index.ts`:
```typescript
export { default as LoginForm } from './LoginForm';
export type { LoginFormProps } from './LoginForm';
```

### Step 5: Migrate Products Feature
Follow the same pattern as auth:

1. Create services, hooks, and proper component structure
2. Move business logic from components to services
3. Create feature-specific state management

### Step 6: Update Shared Components
**Current**: `src/shared/components/`
**New**: Enhanced structure

1. **Reorganize UI components**:
```bash
mkdir -p src/shared/components/{ui,layout,forms}
```

2. **Move components to appropriate categories**:
```bash
# UI components
mv src/shared/components/ui/MetricCard src/shared/components/ui/
mv src/shared/components/ui/QuickActionCard src/shared/components/ui/
mv src/shared/components/ui/ToggleSwitch src/shared/components/ui/
mv src/shared/components/ui/CustomDropdown src/shared/components/ui/

# Layout components  
mv src/shared/components/layout/* src/shared/components/layout/
```

3. **Create component stories and tests**:
```bash
# For each component, create:
touch src/shared/components/ui/Button/Button.test.tsx
touch src/shared/components/ui/Button/Button.stories.tsx
```

## Phase 3: State Management Integration

### Step 7: Implement Global State Management
Choose between Redux Toolkit or Zustand:

**Option A: Redux Toolkit**
```bash
npm install @reduxjs/toolkit react-redux
```

Create `src/core/store/store.ts`:
```typescript
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/auth.slice';
import productSlice from './slices/product.slice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    products: productSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**Option B: Zustand (Recommended for smaller apps)**
```bash
npm install zustand
```

Create `src/core/store/auth.store.ts`:
```typescript
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (credentials) => {
    // Login logic
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));
```

## Phase 4: Application Layer Setup

### Step 8: Create App Layer
Create `src/app/AppProvider.tsx`:
```typescript
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './providers/ThemeProvider';

const queryClient = new QueryClient();

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};
```

Create `src/app/router.tsx`:
```typescript
import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../shared/components/layout';
import { LoginPage } from '../features/auth/pages';
import { DashboardPage } from '../features/dashboard/pages';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      // ... other routes
    ],
  },
]);
```

### Step 9: Update Main App Component
Update `src/app/App.tsx`:
```typescript
import { RouterProvider } from 'react-router-dom';
import { AppProvider } from './AppProvider';
import { router } from './router';

const App = () => {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
};

export default App;
```

## Phase 5: Testing and Documentation

### Step 10: Add Testing Infrastructure
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest jsdom
```

Create `src/shared/components/ui/Button/Button.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Step 11: Add Storybook (Optional)
```bash
npx storybook@latest init
```

Create `src/shared/components/ui/Button/Button.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Button',
  },
};
```

## Migration Checklist

### Pre-Migration
- [ ] Backup current codebase
- [ ] Document current functionality
- [ ] Set up new development branch

### Phase 1: Core Infrastructure
- [ ] Create core directory structure
- [ ] Move constants to core
- [ ] Set up API layer
- [ ] Update import paths

### Phase 2: Feature Migration
- [ ] Migrate auth feature
- [ ] Migrate products feature
- [ ] Migrate remaining features
- [ ] Update shared components

### Phase 3: State Management
- [ ] Choose state management solution
- [ ] Implement global store
- [ ] Migrate component state to global store

### Phase 4: Application Layer
- [ ] Create app providers
- [ ] Set up routing
- [ ] Update main app component

### Phase 5: Testing & Documentation
- [ ] Add testing infrastructure
- [ ] Write component tests
- [ ] Add Storybook (optional)
- [ ] Update documentation

### Post-Migration
- [ ] Test all functionality
- [ ] Update build scripts
- [ ] Update CI/CD pipelines
- [ ] Performance testing
- [ ] Code review

## Benefits of New Architecture

1. **Scalability**: Easy to add new features
2. **Maintainability**: Clear separation of concerns
3. **Testability**: Isolated components and logic
4. **Reusability**: Shared components and utilities
5. **Developer Experience**: Consistent patterns and structure
6. **Performance**: Better code splitting and lazy loading
7. **Type Safety**: Improved TypeScript usage

## Common Pitfalls to Avoid

1. **Don't migrate everything at once** - Do it incrementally
2. **Don't break existing functionality** - Test after each phase
3. **Don't skip testing** - Ensure everything works
4. **Don't forget to update imports** - Use find/replace carefully
5. **Don't rush the migration** - Take time to understand the new structure

## Timeline Estimate

- **Phase 1**: 1-2 days
- **Phase 2**: 3-5 days (depending on feature complexity)
- **Phase 3**: 1-2 days
- **Phase 4**: 1 day
- **Phase 5**: 2-3 days

**Total**: 8-13 days for complete migration
