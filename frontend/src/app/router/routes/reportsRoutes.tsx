import { RouteObject } from 'react-router-dom';
import { PermissionProtectedRoute } from '@/shared/components';
import ReportsPage from '@/pages/reports/ReportsPage';

/** Central Reports module - accessible from sidebar. */
export const reportsRoutes: RouteObject[] = [
  {
    path: 'reports',
    element: (
      <PermissionProtectedRoute>
        <ReportsPage />
      </PermissionProtectedRoute>
    ),
  },
];
