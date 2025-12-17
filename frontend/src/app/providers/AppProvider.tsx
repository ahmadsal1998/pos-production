// Application-level configuration and providers
import React from 'react';
import { DropdownProvider } from '@/shared/contexts/DropdownContext';
import { CurrencyProvider } from '@/shared/contexts/CurrencyContext';
import { ConfirmDialogProvider } from '@/shared/contexts/ConfirmDialogContext';

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <CurrencyProvider>
      <DropdownProvider>
        <ConfirmDialogProvider>
          <div className="app">{children}</div>
        </ConfirmDialogProvider>
      </DropdownProvider>
    </CurrencyProvider>
  );
};
