import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from '@/shared/assets/icons';

interface AuthLayoutProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

const THEME_STORAGE_KEY = 'theme';

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldDark = stored ? stored === 'dark' : prefersDark;
    setIsDark(shouldDark);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [isDark]);

  return (
    <div dir="rtl" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-grid bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4 py-8 font-sans dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Floating theme toggle (moved from inside the card) */}
      <div className="absolute top-4 left-4 z-20">
        <button
          type="button"
          onClick={() => setIsDark(prev => !prev)}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-200"
        >
          {isDark ? (
            <SunIcon />
          ) : (
            <MoonIcon />
          )}
        </button>
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-primary-200 blur-3xl dark:bg-primary-800" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-purple-200 blur-3xl dark:bg-indigo-900" />
        <div className="absolute left-1/3 top-1/4 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-200/60 blur-2xl dark:bg-blue-900/40" />
      </div>

      <div className="relative z-10 w-full max-w-lg animate-fade-in-up">
   

        <div className="rounded-3xl bg-white/90 p-8 py-12 shadow-2xl ring-1 ring-gray-900/10 backdrop-blur-xl transition-transform duration-300 hover:shadow-[0_24px_60px_-15px_rgba(59,130,246,0.35)] dark:bg-gray-900/70 dark:ring-white/10 sm:p-10 sm:py-14">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/40">
              <span className="text-2xl font-bold">P</span>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                PoshPoint
              </div>
              {title && (
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{title}</div>
              )}
            </div>
          </div>

          {subtitle && (
            <div className="mb-6 text-center text-sm text-gray-600 dark:text-gray-300">{subtitle}</div>
          )}

          <div className="mx-auto w-full max-w-md">
            {children}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthLayout;


