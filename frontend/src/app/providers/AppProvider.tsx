// Application-level configuration and providers
import React, { useEffect } from 'react';
import { DropdownProvider } from '@/shared/contexts/DropdownContext';
import { CurrencyProvider } from '@/shared/contexts/CurrencyContext';
import { ConfirmDialogProvider } from '@/shared/contexts/ConfirmDialogContext';
import { salesSync } from '@/lib/sync/salesSync';
import { inventorySync } from '@/lib/sync/inventorySync';

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Initialize sync services on app load
  useEffect(() => {
    // Initialize sales sync
    salesSync.init().catch((error) => {
      console.error('Failed to initialize sales sync:', error);
    });

    // Initialize inventory sync
    inventorySync.initService().catch((error) => {
      console.error('Failed to initialize inventory sync:', error);
    });
  }, []);

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
