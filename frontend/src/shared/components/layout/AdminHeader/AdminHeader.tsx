import React from 'react';
import { SunIcon, MoonIcon } from '@/shared/constants';
import { useThemeStore, useAppStore } from '@/app/store';
import { AR_LABELS } from '@/shared/constants/ui';

interface AdminHeaderProps {
  activePath: string;
  setActivePath: (path: string) => void;
  theme: string;
  setTheme: (theme: string) => void;
  onMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

const getAdminHeaderTitleFromPath = (pathname: string): string => {
  const path = (pathname || '').split('?')[0].split('#')[0];

  if (path === '/admin' || path === '/admin/' || path.startsWith('/admin/dashboard')) return AR_LABELS.adminDashboard;
  if (path.startsWith('/admin/stores')) return AR_LABELS.storeManagement;
  if (path.startsWith('/admin/settings')) return AR_LABELS.systemSettings;
  if (path.startsWith('/admin/users')) return AR_LABELS.usersAndPermissions;
  if (path.startsWith('/admin/trial-accounts')) return AR_LABELS.trialAccounts;

  return AR_LABELS.adminDashboard;
};

const AdminHeader: React.FC<AdminHeaderProps> = ({ onMenuToggle, isMobileMenuOpen, activePath }) => {
  const { theme, toggleTheme } = useThemeStore();
  const { isSidebarCollapsed } = useAppStore();
  const pageTitle = getAdminHeaderTitleFromPath(activePath);

  return (
    <header className={`fixed top-0 left-0 z-[60] bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl backdrop-saturate-150 border-b border-slate-700/80 dark:border-slate-800/80 shadow-lg flex-shrink-0 supports-[backdrop-filter]:bg-slate-900/95 supports-[backdrop-filter]:dark:bg-slate-950/95 transition-all duration-300 ${isSidebarCollapsed ? 'lg:right-20' : 'lg:right-64'} right-0`}>
      <div className="px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex h-16 md:h-20 items-center justify-between">
          {/* Left section: Mobile menu + Title */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Mobile hamburger menu button */}
            <button
              onClick={onMenuToggle}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-slate-300 dark:text-slate-400 hover:bg-slate-800 dark:hover:bg-slate-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all duration-200 lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              <svg
                className={`h-6 w-6 transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Title */}
            <div className="flex items-center min-w-0 flex-1 justify-start">
              <h1
                dir="rtl"
                className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent truncate text-right min-w-0"
              >
                {pageTitle}
              </h1>
            </div>
          </div>

          {/* Right section: Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="group relative inline-flex items-center justify-center w-10 h-10 rounded-xl text-slate-300 dark:text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all duration-200"
              aria-label="Toggle theme"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <span className="relative z-10">{theme === 'light' ? <MoonIcon /> : <SunIcon />}</span>
            </button>

            {/* System Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-medium text-green-400">System Online</span>
            </div>

            {/* Admin Badge */}
            <div className="flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-blue-600/20 border border-blue-500/30">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="hidden sm:block text-sm font-semibold text-blue-400">Admin</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;

