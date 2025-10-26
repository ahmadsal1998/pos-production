import React from 'react';
import { AR_LABELS, SunIcon, MoonIcon } from '../constants'; // TOP_NAV_ITEMS is no longer used here
// FIX: Changed import to `types.ts` to resolve circular dependency.
import { Theme } from '../types';

interface HeaderProps {
  activePath: string;
  setActivePath: (path: string) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const Header: React.FC<HeaderProps> = ({ setActivePath, theme, setTheme }) => { // Removed activePath as it's no longer used for navigation rendering
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/20 p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
      {/* POS System Title (Right in RTL) */}
      <div className="flex items-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">PoshPointHub</h2>
      </div>

      {/* Removed Top Navigation (Center) - No longer rendering TOP_NAV_ITEMS */}

      {/* User Section (Left in RTL) */}
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleTheme} 
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
        <button className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          <span className="absolute top-1 right-1 block h-2 w-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800"></span>
        </button>
        <button className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.58-.354 1.25-.566 1.956-.566zM15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </button>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
          <span className="text-gray-700 dark:text-gray-300 font-medium hidden md:block">{AR_LABELS.ahmadSai}</span>
          <img src="https://picsum.photos/40/40?random=5" alt="User Avatar" className="w-9 h-9 rounded-full ring-2 ring-gray-200 dark:ring-gray-700" />
        </div>
      </div>
    </header>
  );
};

export default Header;
