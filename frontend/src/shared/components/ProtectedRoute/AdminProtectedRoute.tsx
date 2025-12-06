import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/app/store';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * AdminProtectedRoute component that checks authentication and admin status.
 * If user is not authenticated, redirects to /login.
 * If user is authenticated but not admin, redirects to /.
 * If user is admin, renders the children.
 */
export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is admin
  const isAdmin = user && (user.id === 'admin' || user.role === 'Admin');

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

