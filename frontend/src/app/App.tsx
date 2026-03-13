import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { router } from './router';
import { AppProvider } from './providers/AppProvider';
import PWAInstallPrompt from '@/features/pwa/PWAInstallPrompt';

const App = () => {
  useEffect(() => {
    // Check authentication status on app load if needed
  }, []);

  return (
    <AppProvider>
      <RouterProvider router={router} />
      <PWAInstallPrompt />
    </AppProvider>
  );
};

export default App;