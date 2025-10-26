import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from './Dashboard';
import ProductManagementPage from './ProductManagementPage'; // Import the new unified product page
import AddMultiUnitProductPage from './AddMultiUnitProductPage'; // Import the new multi-unit product page
import SalesPage from './SalesPage'; // Import the new unified sales page
import POSPage from './POSPage'; // Import the new POS page
import WholesalePOSPage from './WholesalePOSPage'; // Import the new Wholesale POS page
import RefundsPage from './RefundsPage'; // Import the new Refunds page
import PreferencesPage from './PreferencesPage'; // Import the new Preferences page
import UserManagementPage from './UserManagementPage'; // Import the new User Management page
import PurchasesPage from './PurchasesPage'; // Import the new Purchases page
import ExpensesPage from './ExpensesPage'; // Import the new Expenses page
import ChequesPage from './ChequesPage'; // Import the new Cheques page
// FIX: Import Theme from types.ts to avoid circular dependency
import { Theme } from '../types';

const MainLayout: React.FC = () => {
  const [activePath, setActivePath] = useState<string>('/'); // Set initial active path to dashboard
  const [theme, setTheme] = useState<Theme>('light');

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Default to light mode for mobile devices to prevent auto-switching
      setTheme('light');
    }
  }, []);

  // Apply theme to document and save to localStorage
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove both light and dark classes to ensure clean state
    root.classList.remove('light', 'dark');
    
    // Add the current theme class
    root.classList.add(theme);
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const renderContent = () => {
    if (activePath === '/' || activePath === '/dashboard') {
      return <Dashboard />;
    }
    if (activePath === '/products') {
      return <ProductManagementPage setActivePath={setActivePath} />;
    }
    if (activePath === '/products/add-multi-unit') {
      return <AddMultiUnitProductPage setActivePath={setActivePath} />;
    }
    if (activePath === '/purchases') {
      return <PurchasesPage />;
    }
    if (activePath === '/cheques') {
      return <ChequesPage />;
    }
    if (activePath === '/expenses') {
      return <ExpensesPage />;
    }
    if (activePath === '/sales') {
      return <SalesPage setActivePath={setActivePath} />;
    }
    if (activePath === '/refunds') {
      return <RefundsPage />;
    }
    if (activePath === '/preferences') {
      return <PreferencesPage />;
    }
    if (activePath === '/users') {
      return <UserManagementPage />;
    }
    if (activePath === '/pos/1' || activePath === '/pos') {
      return <POSPage />;
    }
     if (activePath === '/pos/2') {
      return <WholesalePOSPage />;
    }
    
    // Fallback for other routes
    return (
      <div className="text-center text-gray-600 dark:text-gray-400 py-20">
        <h2 className="text-2xl font-bold mb-2">المحتوى لهذه الصفحة سيذهب هنا.</h2>
        <p className="text-gray-500 dark:text-gray-500">المسار الحالي: {activePath}</p>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar activePath={activePath} setActivePath={setActivePath} />

      {/* Main Content Area */}
      <div className="flex-1 mr-64"> {/* mr-64 for RTL to account for fixed sidebar width */}
        <Header activePath={activePath} setActivePath={setActivePath} theme={theme} setTheme={setTheme} />
        <main className="p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
