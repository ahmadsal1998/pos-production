import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from './store';
import { useEffect } from 'react';
import { AppProvider } from './providers/AppProvider';

const App = () => {
  const { isAuthenticated, user } = useAuthStore();

  // Check authentication status on app load
  useEffect(() => {
    // You can add logic here to verify token validity
    // For now, we'll rely on the persisted state
  }, []);

  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
};

export default App;
