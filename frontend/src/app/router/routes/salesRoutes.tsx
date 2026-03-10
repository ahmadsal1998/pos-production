import { Navigate, RouteObject } from 'react-router-dom';
import { PermissionProtectedRoute } from '@/shared/components';
import SalesPage from '@/pages/sales/SalesPage';
import SalesHistoryPage from '@/pages/sales/SalesHistoryPage';
import SalesTodayPage from '@/pages/sales/SalesTodayPage';
import RefundsPage from '@/pages/sales/RefundsPage';
import POSPage from '@/pages/sales/POSPage';
import WholesalePOSPage from '@/pages/sales/WholesalePOSPage';

export const salesRoutes: RouteObject[] = [
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
      { path: 'reports', element: <Navigate to="/reports" replace /> },
      {
        path: 'customer-accounts',
        element: (
          <PermissionProtectedRoute>
            <SalesPage />
          </PermissionProtectedRoute>
        ),
      },
    ],
  },
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
];
