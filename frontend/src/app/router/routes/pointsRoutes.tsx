import { RouteObject } from 'react-router-dom';
import { PermissionProtectedRoute } from '@/shared/components';
import PointsHistoryPage from '@/pages/points/PointsHistoryPage';
import MyStorePointsAccountPage from '@/pages/points/MyStorePointsAccountPage';

export const pointsRoutes: RouteObject[] = [
  {
    path: 'points',
    children: [
      {
        path: 'history',
        element: (
          <PermissionProtectedRoute>
            <PointsHistoryPage />
          </PermissionProtectedRoute>
        ),
      },
    ],
  },
  {
    path: 'my-store-points-account',
    element: (
      <PermissionProtectedRoute>
        <MyStorePointsAccountPage />
      </PermissionProtectedRoute>
    ),
  },
];
