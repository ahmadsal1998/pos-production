import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '@/shared/components/layout';

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import VerificationPage from '@/pages/auth/VerificationPage';

// Dashboard
import DashboardPage from '@/pages/dashboard/Dashboard';

// Product Pages
import ProductDashboard from '@/pages/products/ProductDashboard';
import AddMultiUnitProductPage from '@/pages/products/AddMultiUnitProductPage';
import ProductListPage from '@/pages/products/ProductListPage';
import ProductManagementPage from '@/pages/products/ProductManagementPage';
import ProductPage from '@/pages/products/ProductPage';
import BrandManagementPage from '@/pages/products/BrandManagementPage';
import CategoryManagementPage from '@/pages/products/CategoryManagementPage';

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
  
  // Main Application Routes
  {
    path: '/',
    element: <MainLayout />,
    children: [
      // Dashboard
      {
        index: true,
        element: <DashboardPage />,
      },
      
      // Products Routes
      {
        path: 'products',
        children: [
          {
            index: true,
            element: <ProductDashboard />,
          },
          {
            path: 'list',
            element: <ProductListPage />,
          },
          {
            path: 'management',
            element: <ProductManagementPage />,
          },
          {
            path: 'add-multi-unit',
            element: <AddMultiUnitProductPage />,
          },
          {
            path: 'categories',
            element: <CategoryManagementPage />,
          },
          {
            path: 'brands',
            element: <BrandManagementPage />,
          },
          {
            path: ':id',
            element: <ProductPage />,
          },
        ],
      },
      
      // Sales Routes
      {
        path: 'sales',
        children: [
          {
            index: true,
            element: <SalesPage />,
          },
          {
            path: 'history',
            element: <SalesHistoryPage />,
          },
          {
            path: 'today',
            element: <SalesTodayPage />,
          },
          {
            path: 'refunds',
            element: <RefundsPage />,
          },
        ],
      },
      
      // POS Routes
      {
        path: 'pos',
        children: [
          {
            path: '1',
            element: <POSPage />,
          },
          {
            path: '2',
            element: <WholesalePOSPage />,
          },
        ],
      },
      
      // Financial Routes
      {
        path: 'financial',
        children: [
          {
            path: 'purchases',
            element: <PurchasesPage />,
          },
          {
            path: 'expenses',
            element: <ExpensesPage />,
          },
          {
            path: 'cheques',
            element: <ChequesPage />,
          },
          {
            path: 'payment-methods',
            element: <PaymentMethodsPage />,
          },
        ],
      },
      
      // Direct Financial Routes (for backward compatibility)
      {
        path: 'purchases',
        element: <PurchasesPage />,
      },
      {
        path: 'expenses',
        element: <ExpensesPage />,
      },
      {
        path: 'cheques',
        element: <ChequesPage />,
      },
      
      // User Management Routes
      {
        path: 'user-management',
        children: [
          {
            path: 'preferences',
            element: <PreferencesPage />,
          },
          {
            path: 'users',
            element: <UserManagementPage />,
          },
        ],
      },
      
      // Direct User Management Routes (for backward compatibility)
      {
        path: 'preferences',
        element: <PreferencesPage />,
      },
      {
        path: 'users',
        element: <UserManagementPage />,
      },
    ],
  },
]);

export default router;
