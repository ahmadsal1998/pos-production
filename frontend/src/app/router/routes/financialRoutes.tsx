import { Outlet } from 'react-router-dom';
import { RouteObject } from 'react-router-dom';
import { PermissionProtectedRoute } from '@/shared/components';
import PurchasesPage from '@/pages/financial/PurchasesPage';
import PurchaseInvoicesListPage from '@/pages/financial/PurchaseInvoicesListPage';
import PurchaseInvoiceDetailPage from '@/pages/financial/PurchaseInvoiceDetailPage';
import ExpensesPage from '@/pages/financial/ExpensesPage';
import ChequesPage from '@/pages/financial/ChequesPage';
import PaymentMethodsPage from '@/pages/financial/PaymentMethodsPage';

const PurchasesLayout = () => <Outlet />;

export const financialRoutes: RouteObject[] = [
  {
    path: 'financial',
    children: [
      {
        path: 'purchases',
        element: <PurchasesLayout />,
        children: [
          {
            index: true,
            element: (
              <PermissionProtectedRoute>
                <PurchasesPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'invoices',
            element: (
              <PermissionProtectedRoute>
                <PurchaseInvoicesListPage />
              </PermissionProtectedRoute>
            ),
          },
          {
            path: 'invoices/:id',
            element: (
              <PermissionProtectedRoute>
                <PurchaseInvoiceDetailPage />
              </PermissionProtectedRoute>
            ),
          },
        ],
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
    element: <PurchasesLayout />,
    children: [
      {
        index: true,
        element: (
          <PermissionProtectedRoute>
            <PurchasesPage />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'invoices',
        element: (
          <PermissionProtectedRoute>
            <PurchaseInvoicesListPage />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'invoices/:id',
        element: (
          <PermissionProtectedRoute>
            <PurchaseInvoiceDetailPage />
          </PermissionProtectedRoute>
        ),
      },
    ],
  },
  {
    path: 'suppliers',
    element: (
      <PermissionProtectedRoute>
        <PurchasesPage />
      </PermissionProtectedRoute>
    ),
  },
  {
    path: 'reports',
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
