// Application-level configuration and providers
import React from 'react';
import { DropdownProvider } from '@/shared/contexts/DropdownContext';

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <DropdownProvider>
      <div className="app">
        {children}
      </div>
    </DropdownProvider>
  );
};
