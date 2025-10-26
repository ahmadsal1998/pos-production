import { AR_LABELS, SunIcon, MoonIcon } from '../../../constants';
import { Theme } from '../../../types';

interface HeaderProps {
  activePath: string;
  setActivePath: (path: string) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onMenuClick?: () => void;
}

const Header = ({ theme, setTheme, onMenuClick }: HeaderProps) => {
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-xl transition-all duration-300 dark:border-slate-700/80 dark:bg-slate-900/95 px-4 sm:px-6">
      {/* Left: Mobile Menu Button */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          id="menu-button"
          onClick={onMenuClick}
          className="inline-flex items-center justify-center rounded-xl p-2.5 text-slate-600 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Center: POS System Title */}
      <div className="flex flex-1 items-center justify-center lg:justify-start">
        <div className="flex items-center gap-4">
          <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 sm:flex dark:from-blue-600 dark:to-blue-700">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 transition-colors dark:text-slate-50 sm:text-xl">
              {AR_LABELS.posSystem}
            </h2>
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              نظام إدارة نقاط البيع المتقدم
            </p>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="inline-flex items-center justify-center rounded-xl p-2.5 text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="Toggle theme"
        >
          <div className="relative h-5 w-5">
            <div
              className={`absolute inset-0 transition-all duration-300 ${
                theme === 'light' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
              }`}
            >
              <SunIcon />
            </div>
            <div
              className={`absolute inset-0 transition-all duration-300 ${
                theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
              }`}
            >
              <MoonIcon />
            </div>
          </div>
        </button>

        {/* Notifications */}
        <button
          className="relative inline-flex items-center justify-center rounded-xl p-2.5 text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {/* Notification Badge with Pulse Animation */}
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600"></span>
          </span>
        </button>

        {/* Settings - Hidden on Mobile */}
        <button
          className="hidden items-center justify-center rounded-xl p-2.5 text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 sm:inline-flex"
          aria-label="Settings"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* User Profile Divider */}
        <div className="mx-2 hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block"></div>

        {/* User Profile */}
        <div className="flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-800">
          <div className="hidden flex-col items-end sm:flex">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {AR_LABELS.ahmadSai}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">مدير النظام</span>
          </div>
          <div className="relative">
            <img
              src="https://picsum.photos/40/40?random=5"
              alt="User Avatar"
              className="h-10 w-10 rounded-full border-2 border-slate-200 object-cover ring-2 ring-white shadow-md transition-all duration-300 hover:ring-blue-500 hover:scale-105 dark:border-slate-700 dark:ring-slate-800"
            />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-800"></span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
