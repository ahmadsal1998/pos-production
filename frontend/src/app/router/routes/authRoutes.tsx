import { RouteObject } from 'react-router-dom';
import { ProtectedRoute, StoreTypeProtectedRoute } from '@/shared/components';
import LoginPage from '@/pages/auth/LoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import VerificationPage from '@/pages/auth/VerificationPage';
import ExpiredSubscriptionPage from '@/pages/auth/ExpiredSubscriptionPage';
import PublicInvoicePage from '@/pages/invoice/PublicInvoicePage';
import SimplePOSPage from '@/pages/sales/SimplePOSPage';

/** Standalone auth, invoice, and simple POS routes (no main layout). */
export const authRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/verification', element: <VerificationPage /> },
  { path: '/subscription-expired', element: <ExpiredSubscriptionPage /> },
  { path: '/invoice/:storeId/:invoiceNumber', element: <PublicInvoicePage /> },
  { path: '/invoice/:invoiceNumber', element: <PublicInvoicePage /> },
  {
    path: '/pos/simple',
    element: (
      <ProtectedRoute>
        <StoreTypeProtectedRoute>
          <SimplePOSPage />
        </StoreTypeProtectedRoute>
      </ProtectedRoute>
    ),
  },
];
