import React, { useMemo, useState, useEffect } from 'react';
import { SunIcon, MoonIcon } from '@/shared/constants';
import { useThemeStore, useAppStore, useAuthStore } from '@/app/store';
import { AR_LABELS } from '@/shared/constants/ui';
import { OfflineIndicator } from '@/shared/components/OfflineIndicator/OfflineIndicator';
import {
  isFullscreen,
  isFullscreenSupported,
  toggleFullscreen,
  getFullscreenChangeEventName,
  getFullscreenErrorEventName,
} from '@/shared/utils/fullscreenUtils';

interface HeaderProps {
  activePath: string;
  setActivePath: (path: string) => void;
  theme: string; // Keep for backward compatibility
  setTheme: (theme: string) => void; // Keep for backward compatibility
  onMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

const getHeaderTitleFromPath = (pathname: string): string => {
  const path = (pathname || '').split('?')[0].split('#')[0];

  if (path === '/' || path === '') return AR_LABELS.dashboard;

  // POS
  if (path.startsWith('/pos/2')) return AR_LABELS.wholesalePOS;
  if (path.startsWith('/pos')) return AR_LABELS.pointOfSales;

  // Sales
  if (path.startsWith('/sales/history')) return AR_LABELS.salesHistory;
  if (path.startsWith('/sales/today')) return AR_LABELS.salesToday;
  if (path.startsWith('/sales/refunds')) return AR_LABELS.refundsManagement;
  if (path.startsWith('/sales')) return AR_LABELS.salesManagement;

  // Products
  if (path.startsWith('/products/categories')) return AR_LABELS.categoryManagement;
  if (path.startsWith('/products/brands')) return AR_LABELS.brandManagement;
  if (path.startsWith('/products/warehouses')) return AR_LABELS.warehouseManagement;
  if (path.startsWith('/products/add-multi-unit')) return AR_LABELS.addNewProduct;
  if (path.startsWith('/products/add-new')) return AR_LABELS.addNewProduct;
  if (path.startsWith('/products/add')) return AR_LABELS.addNewProduct;
  if (path.startsWith('/products/edit/')) return AR_LABELS.editProduct;
  if (path.startsWith('/products/management')) return AR_LABELS.productManagement;
  if (path.startsWith('/products/list')) return AR_LABELS.productListing;
  if (path.startsWith('/products/')) return AR_LABELS.products;
  if (path.startsWith('/products')) return AR_LABELS.products;

  // Financial
  if (path.startsWith('/financial/purchases') || path.startsWith('/purchases')) return AR_LABELS.purchases;
  if (path.startsWith('/financial/expenses') || path.startsWith('/expenses')) return AR_LABELS.expenses;
  if (path.startsWith('/financial/cheques') || path.startsWith('/cheques')) return AR_LABELS.cheques;
  if (path.startsWith('/financial/payment-methods')) return AR_LABELS.paymentMethodsManagement;

  // User Management
  if (path.startsWith('/user-management/users') || path.startsWith('/users')) return AR_LABELS.userManagement;
  if (path.startsWith('/user-management/preferences') || path.startsWith('/preferences')) return AR_LABELS.preferences;

  // Admin (in case any admin route renders this header)
  if (path.startsWith('/admin')) return AR_LABELS.adminDashboard;

  return '';
};

const Header: React.FC<HeaderProps> = ({ activePath, onMenuToggle, isMobileMenuOpen }) => {
  const { theme, toggleTheme } = useThemeStore();
  const { isSidebarCollapsed } = useAppStore();
  const { user } = useAuthStore();
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const pageTitle = useMemo(() => getHeaderTitleFromPath(activePath), [activePath]);

  useEffect(() => {
    // Check if fullscreen is supported
    setFullscreenSupported(isFullscreenSupported());
    setIsFullscreenMode(isFullscreen());

    // Listen for fullscreen changes (handles all vendor prefixes)
    const changeEventName = getFullscreenChangeEventName();
    const errorEventName = getFullscreenErrorEventName();

    const handleFullscreenChange = () => {
      setIsFullscreenMode(isFullscreen());
    };

    const handleFullscreenError = (event: Event) => {
      console.error('Fullscreen error:', event);
      // Update state in case of error
      setIsFullscreenMode(isFullscreen());
    };

    document.addEventListener(changeEventName, handleFullscreenChange);
    document.addEventListener(errorEventName, handleFullscreenError);

    return () => {
      document.removeEventListener(changeEventName, handleFullscreenChange);
      document.removeEventListener(errorEventName, handleFullscreenError);
    };
  }, []);

  const handleToggleFullscreen = async (event: React.MouseEvent | React.TouchEvent) => {
    // Ensure this is triggered by user interaction (required on mobile)
    // Don't prevent default on mobile to allow natural touch behavior
    event.stopPropagation();

    try {
      await toggleFullscreen();
    } catch (error: any) {
      console.error('Error toggling fullscreen:', error);
      
      // Show user-friendly error message on mobile
      if (error?.message?.includes('denied') || error?.message?.includes('user action')) {
        // On mobile, some browsers show their own prompts
        // We can show a helpful message if needed
        console.warn('Fullscreen request denied. This may require a direct user interaction on mobile browsers.');
      }
    }
  };

  return (
    <header className={`fixed top-0 left-0 z-[60] bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-200/80 dark:border-gray-800/80 shadow-sm flex-shrink-0 supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-gray-900/80 transition-all duration-300 ${isSidebarCollapsed ? 'lg:right-20' : 'lg:right-64'} right-0`}>
      <div className="px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex h-16 md:h-20 items-center justify-between">
          {/* Left section: Mobile menu + Logo */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Mobile hamburger menu button */}
            <button
              onClick={onMenuToggle}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 transition-all duration-200 lg:hidden"
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
              {pageTitle ? (
                <h1
                  dir="rtl"
                  className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 truncate text-right min-w-0"
                >
                  {pageTitle}
                </h1>
              ) : null}
            </div>
          </div>

          {/* Right section: Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-shrink-0">
            {/* Offline Status Indicator */}
            <OfflineIndicator className="hidden sm:flex" />
            
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="group relative inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200"
              aria-label="Toggle theme"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <span className="relative z-10">{theme === 'light' ? <MoonIcon /> : <SunIcon />}</span>
            </button>

            {/* Fullscreen toggle button */}
            {fullscreenSupported && (
              <button
                onClick={handleToggleFullscreen}
                className="group relative inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 active:scale-95"
                style={{ touchAction: 'manipulation' }}
                aria-label={isFullscreenMode ? 'Exit fullscreen' : 'Enter fullscreen'}
                title={isFullscreenMode ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <span className="relative z-10">
                  {isFullscreenMode ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                    />
                  </svg>
                  )}
                </span>
              </button>
            )}

            {/* Settings button - hidden on mobile */}
            <button
              className="group relative hidden sm:inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200"
              aria-label="Open settings"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <span className="relative z-10">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.58-.354 1.25-.566 1.956-.566zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </span>
            </button>

            {/* User profile */}
            <div className="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer group">
              <span className="hidden sm:block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {user?.fullName || user?.username || 'User'}
              </span>
              <div className="relative">
                <img
                  src="https://picsum.photos/40/40?random=5"
                  alt="User Avatar"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl ring-2 ring-gray-200 dark:ring-gray-700 group-hover:ring-orange-500 dark:group-hover:ring-orange-500 transition-all duration-200 object-cover"
                />
                <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-900"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;