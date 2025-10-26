# Migration Guide: From Current to Clean Architecture

## Phase 1: Setup New Structure (Week 1)

### Step 1: Create New Folder Structure
```bash
# Create the new directory structure
mkdir -p src/{app/{providers,router,store},shared/{components/{ui,forms,layout,feedback},hooks,utils,constants,types,assets/{icons,images,styles}},features/{auth,dashboard,products,sales,pos,inventory,customers,reports,settings},pages,__tests__/{components,features,utils}}
```

### Step 2: Move Shared Components First
Start with the most reusable components:

**Move to `src/shared/components/layout/`:**
- `MainLayout.tsx` → `src/shared/components/layout/MainLayout/`
- `Header.tsx` → `src/shared/components/layout/Header/`
- `Sidebar.tsx` → `src/shared/components/layout/Sidebar/`

**Move to `src/shared/components/ui/`:**
- `MetricCard.tsx` → `src/shared/components/ui/MetricCard/`
- `QuickActionCard.tsx` → `src/shared/components/ui/QuickActionCard/`

### Step 3: Split Large Files

**Split `types.ts` (425 lines):**
```typescript
// src/shared/types/common.ts
export interface NavItem { ... }
export interface TopNavItem { ... }
export type Theme = 'light' | 'dark';

// src/features/auth/types/auth.types.ts
export interface User { ... }
export type SystemRole = 'Admin' | 'Manager' | 'Cashier';

// src/features/products/types/product.types.ts
export interface Product { ... }
export interface MultiUnitProduct { ... }

// src/features/sales/types/sales.types.ts
export interface SaleTransaction { ... }
export interface POSCartItem { ... }
```

**Split `constants.tsx` (771 lines):**
```typescript
// src/shared/constants/ui.ts
export const AR_LABELS = { ... };

// src/shared/constants/routes.ts
export const NAV_ITEMS = [ ... ];
export const TOP_NAV_ITEMS = [ ... ];

// src/shared/assets/icons/index.ts
export const DashboardIcon = () => <svg ... />;
export const ProductsIcon = () => <svg ... />;
```

## Phase 2: Feature Migration (Week 2-3)

### Step 4: Create Feature Modules

**Auth Feature (`src/features/auth/`):**
```typescript
// src/features/auth/components/index.ts
export { default as LoginPage } from './LoginForm/LoginForm';
export { default as ForgotPasswordPage } from './ForgotPasswordForm/ForgotPasswordForm';
export { default as VerificationPage } from './VerificationForm/VerificationForm';
export { default as ResetPasswordPage } from './ResetPasswordForm/ResetPasswordForm';

// src/features/auth/hooks/useAuth.ts
export const useAuth = () => {
  // Move auth logic here
};

// src/features/auth/services/authService.ts
export const authService = {
  login: async (credentials) => { ... },
  logout: async () => { ... },
  // ... other auth methods
};
```

**Products Feature (`src/features/products/`):**
```typescript
// src/features/products/components/index.ts
export { default as ProductListPage } from './ProductList/ProductList';
export { default as AddProductForm } from './ProductForm/AddProductForm';
export { default as AddMultiUnitProductPage } from './ProductForm/AddMultiUnitProductPage';

// src/features/products/hooks/useProducts.ts
export const useProducts = () => {
  // Move product-related logic here
};

// src/features/products/services/productService.ts
export const productService = {
  getProducts: async () => { ... },
  createProduct: async (product) => { ... },
  // ... other product methods
};
```

### Step 5: Create Page Components
```typescript
// src/pages/DashboardPage.tsx
import { Dashboard } from '@/features/dashboard';

export const DashboardPage = () => {
  return <Dashboard />;
};

// src/pages/ProductsPage.tsx
import { ProductManagementPage } from '@/features/products';

export const ProductsPage = () => {
  return <ProductManagementPage />;
};
```

## Phase 3: App-Level Configuration (Week 4)

### Step 6: Setup Providers
```typescript
// src/app/providers/ThemeProvider.tsx
export const ThemeProvider = ({ children }) => {
  // Move theme logic from MainLayout
};

// src/app/providers/AuthProvider.tsx
export const AuthProvider = ({ children }) => {
  // Move auth state management
};

// src/app/providers/index.ts
export { ThemeProvider } from './ThemeProvider';
export { AuthProvider } from './AuthProvider';
```

### Step 7: Setup Routing
```typescript
// src/app/router/routes.ts
export const routes = [
  { path: '/', component: 'DashboardPage' },
  { path: '/products', component: 'ProductsPage' },
  { path: '/sales', component: 'SalesPage' },
  // ... other routes
];

// src/app/router/AppRouter.tsx
export const AppRouter = () => {
  // Implement routing logic
};
```

### Step 8: Update Main App
```typescript
// src/App.tsx
import { ThemeProvider, AuthProvider } from '@/app/providers';
import { AppRouter } from '@/app/router';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
};
```

## Phase 4: Testing & Optimization (Week 5)

### Step 9: Add Testing Structure
```typescript
// src/__tests__/setup.ts
import { render } from '@testing-library/react';
import { ThemeProvider } from '@/app/providers';

const customRender = (ui, options) =>
  render(ui, { wrapper: ThemeProvider, ...options });

export * from '@testing-library/react';
export { customRender as render };

// src/__tests__/components/Button.test.tsx
import { render, screen } from '../setup';
import { Button } from '@/shared/components/ui/Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Step 10: Add Barrel Exports
```typescript
// src/shared/components/ui/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';

// src/features/products/index.ts
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
```

## Phase 5: Cleanup & Documentation (Week 6)

### Step 11: Remove Old Files
- Delete old `components/` folder
- Delete old `types.ts` and `constants.tsx`
- Update all import statements

### Step 12: Add Documentation
```typescript
// src/README.md
# Project Structure

## Features
Each feature is self-contained with:
- `components/` - Feature-specific UI components
- `hooks/` - Custom hooks for the feature
- `services/` - API calls and business logic
- `types/` - TypeScript type definitions
- `index.ts` - Barrel export for clean imports

## Shared
Reusable components and utilities:
- `components/` - Shared UI components
- `hooks/` - Shared custom hooks
- `utils/` - Utility functions
- `constants/` - App-wide constants
- `types/` - Shared type definitions
```

## Migration Checklist

### Week 1: Foundation
- [ ] Create new folder structure
- [ ] Move shared components
- [ ] Split large files (types.ts, constants.tsx)
- [ ] Create basic barrel exports

### Week 2-3: Features
- [ ] Create auth feature module
- [ ] Create products feature module
- [ ] Create sales feature module
- [ ] Create POS feature module
- [ ] Create remaining feature modules

### Week 4: App Configuration
- [ ] Setup providers (Theme, Auth)
- [ ] Implement routing
- [ ] Update main App component
- [ ] Test navigation

### Week 5: Testing
- [ ] Add testing setup
- [ ] Write component tests
- [ ] Write feature tests
- [ ] Add test utilities

### Week 6: Cleanup
- [ ] Remove old files
- [ ] Update all imports
- [ ] Add documentation
- [ ] Performance optimization

## Benefits After Migration

1. **Better Organization**: Code is logically grouped by feature
2. **Easier Maintenance**: Changes are isolated to specific features
3. **Improved Scalability**: Easy to add new features
4. **Better Testing**: Clear structure for writing tests
5. **Enhanced Developer Experience**: Intuitive navigation and imports
6. **Type Safety**: Better TypeScript organization and inference
7. **Code Reusability**: Shared components are easily accessible
8. **Performance**: Better code splitting and lazy loading opportunities

## Common Pitfalls to Avoid

1. **Don't move everything at once** - Migrate incrementally
2. **Keep old structure until migration is complete** - Don't delete files too early
3. **Test after each phase** - Ensure functionality is preserved
4. **Update imports gradually** - Use find/replace carefully
5. **Don't skip barrel exports** - They make imports much cleaner
6. **Document as you go** - Keep track of changes and decisions
