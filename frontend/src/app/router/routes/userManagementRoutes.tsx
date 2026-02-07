import { RouteObject } from 'react-router-dom';
import { PermissionProtectedRoute } from '@/shared/components';
import PreferencesPage from '@/pages/user-management/PreferencesPage';
import UserManagementPage from '@/pages/user-management/UserManagementPage';

export const userManagementRoutes: RouteObject[] = [
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
];
