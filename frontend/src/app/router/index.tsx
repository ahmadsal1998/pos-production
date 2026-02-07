import { createBrowserRouter } from 'react-router-dom';
import { MainLayout, AdminLayout } from '@/shared/components/layout';
import { ProtectedRoute, AdminProtectedRoute, StoreTypeProtectedRoute } from '@/shared/components';
import { authRoutes, mainLayoutRoutes, adminRoutes } from './routes';

export const router = createBrowserRouter([
  ...authRoutes,
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <StoreTypeProtectedRoute>
          <MainLayout />
        </StoreTypeProtectedRoute>
      </ProtectedRoute>
    ),
    children: mainLayoutRoutes,
  },
  {
    path: '/admin',
    element: (
      <AdminProtectedRoute>
        <AdminLayout />
      </AdminProtectedRoute>
    ),
    children: adminRoutes,
  },
]);

export default router;
