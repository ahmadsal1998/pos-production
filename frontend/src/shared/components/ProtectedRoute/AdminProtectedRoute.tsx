import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/app/store';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * AdminProtectedRoute component that checks authentication and system admin status.
 * Only users with userId === 'admin' (system admin from .env) can access admin routes.
 * Store owners/users with role 'Admin' cannot access system admin routes.
 * If user is not authenticated, redirects to /login.
 * If user is authenticated but not system admin, redirects to /.
 * If user is system admin, renders the children.
 */
export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only system admin (userId === 'admin' from .env credentials) can access admin routes
  // Store owners/users with role 'Admin' should NOT have access
  const isSystemAdmin = user && user.id === 'admin';

  if (!isSystemAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

