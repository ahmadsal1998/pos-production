// Application-level configuration and providers
import React from 'react';
import { DropdownProvider } from '@/shared/contexts/DropdownContext';
import { CurrencyProvider } from '@/shared/contexts/CurrencyContext';

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <CurrencyProvider>
      <DropdownProvider>
        <div className="app">
          {children}
        </div>
      </DropdownProvider>
    </CurrencyProvider>
  );
};
