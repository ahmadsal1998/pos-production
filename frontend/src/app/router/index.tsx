import { createBrowserRouter } from 'react-router-dom';
import { MainLayout, AdminLayout } from '@/shared/components/layout';
import { ProtectedRoute, PermissionProtectedRoute, AdminProtectedRoute } from '@/shared/components';

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import VerificationPage from '@/pages/auth/VerificationPage';
import ExpiredSubscriptionPage from '@/pages/auth/ExpiredSubscriptionPage';

// Dashboard
import DashboardPage from '@/pages/dashboard/Dashboard';

// Product Pages
import ProductDashboard from '@/pages/products/ProductDashboard';
import AddMultiUnitProductPage from '@/pages/products/AddMultiUnitProductPage';
import AddNewProductPage from '@/pages/products/AddNewProductPage';
import AddAdditionalUnitsPage from '@/pages/products/AddAdditionalUnitsPage';
import AddProductPage from '@/pages/products/AddProductPage';
import ProductListPage from '@/pages/products/ProductListPage';
import ProductManagementPage from '@/pages/products/ProductManagementPage';
import ProductPage from '@/pages/products/ProductPage';
import BrandManagementPage from '@/pages/products/BrandManagementPage';
import CategoryManagementPage from '@/pages/products/CategoryManagementPage';
import WarehouseManagementPage from '@/pages/products/WarehouseManagementPage';

// Sales Pages
import SalesPage from '@/pages/sales/SalesPage';
import POSPage from '@/pages/sales/POSPage';
import WholesalePOSPage from '@/pages/sales/WholesalePOSPage';
import RefundsPage from '@/pages/sales/RefundsPage';
import SalesHistoryPage from '@/pages/sales/SalesHistoryPage';
import SalesTodayPage from '@/pages/sales/SalesTodayPage';

// Financial Pages
import PurchasesPage from '@/pages/financial/PurchasesPage';
import ExpensesPage from '@/pages/financial/ExpensesPage';
import ChequesPage from '@/pages/financial/ChequesPage';
import PaymentMethodsPage from '@/pages/financial/PaymentMethodsPage';


// User Management Pages
import PreferencesPage from '@/pages/user-management/PreferencesPage';
import UserManagementPage from '@/pages/user-management/UserManagementPage';

// Admin Pages
import { AdminDashboard } from '@/pages/admin';

export const router = createBrowserRouter([
  // Auth Routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/verification',
    element: <VerificationPage />,
  },
  {
    path: '/subscription-expired',
    element: <ExpiredSubscriptionPage />,
  },
  
  // Main Application Routes (Protected)
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      // Dashboard
      {
        index: true,
        element: (
          <PermissionProtectedRoute>
            <DashboardPage />
          </PermissionProtectedRoute>
        ),
      },
      
      // Products Routes
      {
        path: 'products',
        children: [
          {
            index: true,
            element: (
              <PermissionProtectedRoute>
                <ProductDashboard />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'list',
            element: (
              <PermissionProtectedRoute>
                <ProductListPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'management',
            element: (
              <PermissionProtectedRoute>
                <ProductManagementPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'add',
            element: (
              <PermissionProtectedRoute>
                <AddProductPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'edit/:id',
            element: (
              <PermissionProtectedRoute>
                <AddProductPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'add-multi-unit',
            element: (
              <PermissionProtectedRoute>
                <AddMultiUnitProductPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'add-new',
            element: (
              <PermissionProtectedRoute>
                <AddNewProductPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'categories',
            element: (
              <PermissionProtectedRoute>
                <CategoryManagementPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'brands',
            element: (
              <PermissionProtectedRoute>
                <BrandManagementPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'warehouses',
            element: (
              <PermissionProtectedRoute>
                <WarehouseManagementPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: ':productId/add-units',
            element: (
              <PermissionProtectedRoute>
                <AddAdditionalUnitsPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: ':id',
            element: (
              <PermissionProtectedRoute>
                <ProductPage />
              </PermissionProtectedRoute>
            ),
          },
        ],
      },
      
      // Sales Routes
      {
        path: 'sales',
        children: [
          {
            index: true,
            element: (
              <PermissionProtectedRoute>
                <SalesPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'history',
            element: (
              <PermissionProtectedRoute>
                <SalesHistoryPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'today',
            element: (
              <PermissionProtectedRoute>
                <SalesTodayPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'refunds',
            element: (
              <PermissionProtectedRoute>
                <RefundsPage />
              </PermissionProtectedRoute>
            ),
          },
        ],
      },
      
      // POS Routes
      {
        path: 'pos',
        children: [
          {
            path: '1',
            element: (
              <PermissionProtectedRoute requiredPermission="posRetail">
                <POSPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: '2',
            element: (
              <PermissionProtectedRoute requiredPermission="posWholesale">
                <WholesalePOSPage />
              </PermissionProtectedRoute>
            ),
          },
        ],
      },
      
      // Financial Routes
      {
        path: 'financial',
        children: [
          {
            path: 'purchases',
            element: (
              <PermissionProtectedRoute>
                <PurchasesPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'expenses',
            element: (
              <PermissionProtectedRoute>
                <ExpensesPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'cheques',
            element: (
              <PermissionProtectedRoute>
                <ChequesPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'payment-methods',
            element: (
              <PermissionProtectedRoute>
                <PaymentMethodsPage />
              </PermissionProtectedRoute>
            ),
          },
        ],
      },
      
      // Direct Financial Routes (for backward compatibility)
      {
        path: 'purchases',
        element: (
          <PermissionProtectedRoute>
            <PurchasesPage />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'expenses',
        element: (
          <PermissionProtectedRoute>
            <ExpensesPage />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'cheques',
        element: (
          <PermissionProtectedRoute>
            <ChequesPage />
          </PermissionProtectedRoute>
        ),
      },
      
      // User Management Routes
      {
        path: 'user-management',
        children: [
          {
            path: 'preferences',
            element: (
              <PermissionProtectedRoute>
                <PreferencesPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'users',
            element: (
              <PermissionProtectedRoute>
                <UserManagementPage />
              </PermissionProtectedRoute>
            ),
          },
        ],
      },
      
      // Direct User Management Routes (for backward compatibility)
      {
        path: 'preferences',
        element: (
          <PermissionProtectedRoute>
            <PreferencesPage />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <PermissionProtectedRoute>
            <UserManagementPage />
          </PermissionProtectedRoute>
        ),
      },
    ],
  },
  
  // Admin Routes - Separate UI System
  {
    path: '/admin',
    element: <AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>,
    children: [
      {
        path: 'dashboard',
        element: <AdminDashboard />,
      },
      {
        path: 'stores',
        element: <AdminDashboard />, // For now, same page. Can be separated later
      },
      {
        path: 'settings',
        element: <AdminDashboard />, // Placeholder for settings page
      },
      {
        path: 'users',
        element: <AdminDashboard />, // Placeholder for users page
      },
    ],
  },
]);

export default router;
