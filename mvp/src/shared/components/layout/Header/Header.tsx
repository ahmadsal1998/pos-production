import React from 'react';
import { AR_LABELS, SunIcon, MoonIcon } from '@/shared/constants';
import { useThemeStore } from '@/app/store';

interface HeaderProps {
  activePath: string;
  setActivePath: (path: string) => void;
  theme: string; // Keep for backward compatibility
  setTheme: (theme: string) => void; // Keep for backward compatibility
  onMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, isMobileMenuOpen }) => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="sticky top-0 z-[60] bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-200/80 dark:border-gray-800/80 shadow-sm w-full flex-shrink-0 supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-gray-900/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex h-16 md:h-20 items-center justify-between">
          {/* Left section: Mobile menu + Logo */}
          <div className="flex items-center gap-4 flex-shrink-0">
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

            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 bg-clip-text text-transparent">
                PoshPointHub
              </h1>
            </div>
          </div>

          {/* Right section: Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
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

            {/* Notifications button */}
            <button
              className="group relative inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200"
              aria-label="View notifications"
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
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </span>
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 z-20">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500 ring-2 ring-white dark:ring-gray-900"></span>
              </span>
            </button>

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
                {AR_LABELS.ahmadSai}
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