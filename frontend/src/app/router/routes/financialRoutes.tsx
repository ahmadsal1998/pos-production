import { RouteObject } from 'react-router-dom';
import { PermissionProtectedRoute } from '@/shared/components';
import PurchasesPage from '@/pages/financial/PurchasesPage';
import ExpensesPage from '@/pages/financial/ExpensesPage';
import ChequesPage from '@/pages/financial/ChequesPage';
import PaymentMethodsPage from '@/pages/financial/PaymentMethodsPage';

export const financialRoutes: RouteObject[] = [
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
];
