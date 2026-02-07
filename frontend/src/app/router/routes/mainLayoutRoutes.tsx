import { RouteObject } from 'react-router-dom';
import { PermissionProtectedRoute } from '@/shared/components';
import DashboardPage from '@/pages/dashboard/Dashboard';
import { productRoutes } from './productRoutes';
import { salesRoutes } from './salesRoutes';
import { financialRoutes } from './financialRoutes';
import { userManagementRoutes } from './userManagementRoutes';
import { pointsRoutes } from './pointsRoutes';

/** All children of the main layout (path: '/'). */
export const mainLayoutRoutes: RouteObject[] = [
  {
    index: true,
    element: (
      <PermissionProtectedRoute>
        <DashboardPage />
      </PermissionProtectedRoute>
    ),
  },
  ...productRoutes,
  ...salesRoutes,
  ...financialRoutes,
  ...userManagementRoutes,
  ...pointsRoutes,
];
