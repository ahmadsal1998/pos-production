import { RouteObject } from 'react-router-dom';
import { PermissionProtectedRoute } from '@/shared/components';
import ProductDashboard from '@/pages/products/ProductDashboard';
import ProductListPage from '@/pages/products/ProductListPage';
import ProductManagementPage from '@/pages/products/ProductManagementPage';
import AddProductPage from '@/pages/products/AddProductPage';
import AddMultiUnitProductPage from '@/pages/products/AddMultiUnitProductPage';
import AddNewProductPage from '@/pages/products/AddNewProductPage';
import AddAdditionalUnitsPage from '@/pages/products/AddAdditionalUnitsPage';
import ProductPage from '@/pages/products/ProductPage';

export const productRoutes: RouteObject[] = [
  {
    path: 'products',
    children: [
      {
        index: true,
        element: (
          <PermissionProtectedRoute>
            <ProductDashboard />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'list',
        element: (
          <PermissionProtectedRoute>
            <ProductListPage />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'management',
        element: (
          <PermissionProtectedRoute>
            <ProductManagementPage />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'add',
        element: (
          <PermissionProtectedRoute>
            <AddProductPage />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'edit/:id',
        element: (
          <PermissionProtectedRoute>
            <AddProductPage />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'add-multi-unit',
        element: (
          <PermissionProtectedRoute>
            <AddMultiUnitProductPage />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'add-new',
        element: (
          <PermissionProtectedRoute>
            <AddNewProductPage />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'import',
        element: (
          <PermissionProtectedRoute>
            <ProductDashboard />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'categories',
        element: (
          <PermissionProtectedRoute>
            <ProductDashboard />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'brands',
        element: (
          <PermissionProtectedRoute>
            <ProductDashboard />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'warehouses',
        element: (
          <PermissionProtectedRoute>
            <ProductDashboard />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: 'units',
        element: (
          <PermissionProtectedRoute>
            <ProductDashboard />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: ':productId/add-units',
        element: (
          <PermissionProtectedRoute>
            <AddAdditionalUnitsPage />
          </PermissionProtectedRoute>
        ),
      },
      {
        path: ':id',
        element: (
          <PermissionProtectedRoute>
            <ProductPage />
          </PermissionProtectedRoute>
        ),
      },
    ],
  },
];
