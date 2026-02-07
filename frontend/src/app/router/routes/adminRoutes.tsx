import { RouteObject } from 'react-router-dom';
import { AdminDashboard } from '@/pages/admin';
import TrialAccountsPage from '@/pages/admin/TrialAccountsPage';
import PointsSettingsPage from '@/pages/admin/PointsSettingsPage';
import StoreAccountsPage from '@/pages/admin/StoreAccountsPage';

export const adminRoutes: RouteObject[] = [
  { path: 'dashboard', element: <AdminDashboard /> },
  { path: 'stores', element: <AdminDashboard /> },
  { path: 'store-types', element: <AdminDashboard /> },
  { path: 'settings', element: <AdminDashboard /> },
  { path: 'points-settings', element: <PointsSettingsPage /> },
  { path: 'store-accounts', element: <StoreAccountsPage /> },
  { path: 'users', element: <AdminDashboard /> },
  { path: 'trial-accounts', element: <TrialAccountsPage /> },
];
