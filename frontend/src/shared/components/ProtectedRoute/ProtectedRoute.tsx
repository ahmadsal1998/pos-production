import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/app/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that checks authentication status.
 * If user is not authenticated, redirects to /login.
 * If user is authenticated, renders the children.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

