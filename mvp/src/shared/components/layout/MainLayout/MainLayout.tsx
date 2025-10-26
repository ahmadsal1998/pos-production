import { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import { Dashboard } from '../../../../features/dashboard';
import { Theme } from '../../../types';

const MainLayout = () => {
  const [activePath, setActivePath] = useState<string>('/');
  const [theme, setTheme] = useState<Theme>('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setTheme(savedTheme);
      } else {
        setTheme('light');
      }
    } catch (e) {
      // Fallback if localStorage is unavailable
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
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      // Ignore localStorage errors
      console.warn('Could not save theme to localStorage:', e);
    }
  }, [theme]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const sidebar = document.getElementById('sidebar');
      const menuButton = document.getElementById('menu-button');
      
      if (sidebarOpen && sidebar && !sidebar.contains(target) && !menuButton?.contains(target)) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  const renderContent = () => {
    if (activePath === '/' || activePath === '/dashboard') {
      return <Dashboard />;
    }

    return (
      <div className="py-12 px-4 text-center">
        <div className="mx-auto max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-4">
              <svg className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">المحتوى لهذه الصفحة سيذهب هنا</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-2">المسار الحالي: <span className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{activePath}</span></p>
          <p className="text-sm text-slate-500 dark:text-slate-500">هذه الصفحة قيد التطوير...</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-all duration-300 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        id="sidebar"
        className={`fixed right-0 top-0 z-50 h-screen transition-all duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <Sidebar
          activePath={activePath}
          setActivePath={path => {
            setActivePath(path);
            setSidebarOpen(false); // Close sidebar on mobile after navigation
          }}
        />
      </div>

      {/* Main Content Area */}
      <div className="w-full flex-1 lg:mr-64 lg:transition-all duration-300">
        <Header
          activePath={activePath}
          setActivePath={setActivePath}
          theme={theme}
          setTheme={setTheme}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="pb-4 sm:pb-6 lg:pb-8 min-h-[calc(100vh-4rem)]">
          <div className="w-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
