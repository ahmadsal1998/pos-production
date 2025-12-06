import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useThemeStore, useAppStore } from '@/app/store';
import AdminSidebar from '../AdminSidebar/AdminSidebar';
import AdminHeader from '../AdminHeader/AdminHeader';
import { DropdownProvider } from '@/shared/contexts/DropdownContext';

const AdminLayout: React.FC = () => {
  const { theme } = useThemeStore();
  const { isMobileMenuOpen, setMobileMenuOpen, isSidebarCollapsed } = useAppStore();
  const location = useLocation();

  // Apply theme to document
  React.useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove both light and dark classes to ensure clean state
    root.classList.remove('light', 'dark');
    
    // Add the current theme class
    root.classList.add(theme);
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle window resize to close mobile menu on desktop
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setMobileMenuOpen]);

  return (
    <DropdownProvider>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <AdminSidebar 
          activePath={location.pathname} 
          setActivePath={() => {}}
          isOpen={isMobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col w-full transition-all duration-300 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} min-w-0 overflow-hidden`}>
          <AdminHeader 
            activePath={location.pathname} 
            setActivePath={() => {}}
            theme={theme} 
            setTheme={() => {}}
            onMenuToggle={() => setMobileMenuOpen(!isMobileMenuOpen)}
            isMobileMenuOpen={isMobileMenuOpen}
          />
          {/* Add padding-top to account for fixed header height */}
          <main className="flex-1 w-full overflow-y-auto overflow-x-hidden min-h-0 pt-16 md:pt-20">
            <Outlet />
          </main>
        </div>
      </div>
    </DropdownProvider>
  );
};

export default AdminLayout;

