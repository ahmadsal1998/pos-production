// Application-level configuration and providers
import React from 'react';

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <div className="app">
      {children}
    </div>
  );
};
