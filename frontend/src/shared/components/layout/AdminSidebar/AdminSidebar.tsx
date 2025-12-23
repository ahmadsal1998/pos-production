import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore, useAuthStore } from '@/app/store';
import { useDropdown } from '@/shared/contexts/DropdownContext';
import { LogoutIcon } from '@/shared/assets/icons';
import { AR_LABELS } from '@/shared/constants/ui';

interface AdminSidebarProps {
  activePath: string;
  setActivePath: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// Admin-specific navigation items
const ADMIN_NAV_ITEMS = [
  {
    id: 1,
    label: AR_LABELS.adminDashboard,
    path: '/admin/dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 2,
    label: AR_LABELS.storeManagement,
    path: '/admin/stores',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 3,
    label: AR_LABELS.systemSettings,
    path: '/admin/settings',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 6,
    label: 'إعدادات النقاط',
    path: '/admin/points-settings',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 7,
    label: 'حسابات النقاط للمتاجر',
    path: '/admin/store-accounts',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 4,
    label: AR_LABELS.usersAndPermissions,
    path: '/admin/users',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 5,
    label: 'الحسابات التجريبية',
    path: '/admin/trial-accounts',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSidebarCollapsed, toggleSidebar } = useAppStore();
  const { setOpenDropdownId, closeAllDropdowns } = useDropdown();
  const { logout, user } = useAuthStore();

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('.admin-sidebar-container')) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleNavClick = () => {
    onClose(); // Close sidebar after navigation on mobile
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      onClose(); // Close sidebar on mobile after logout
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`admin-sidebar-container fixed top-0 right-0 h-screen flex flex-col z-40 transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } ${isSidebarCollapsed ? 'w-20 lg:w-20' : 'w-72 lg:w-64'} ${
          'bg-slate-900 dark:bg-slate-950 border-l border-slate-700 dark:border-slate-800 shadow-xl'
        }`}
      >
        {/* Logo Section with Toggle Button */}
        <div className="relative px-4 py-5 border-b border-slate-700 dark:border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start gap-3'}`}>
            {/* Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="group flex items-center justify-center w-9 h-9 rounded-xl text-slate-300 dark:text-slate-400 hover:bg-blue-600 dark:hover:bg-blue-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all duration-200 flex-shrink-0"
              aria-label="Toggle sidebar"
              aria-expanded={!isSidebarCollapsed}
              title={isSidebarCollapsed ? AR_LABELS.expandSidebar : AR_LABELS.collapseSidebar}
            >
              <svg
                className="h-5 w-5 transition-transform duration-300 group-hover:scale-110"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                {isSidebarCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                )}
              </svg>
            </button>
            
            {/* Logo Text - Hidden when collapsed */}
            <span className={`text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent transition-all duration-300 whitespace-nowrap ${
              isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}>
              {AR_LABELS.brandRestaurantAdmin}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-grow overflow-y-auto px-3 py-4 custom-scrollbar">
          <ul className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const itemIsActive = location.pathname === item.path;
              return (
                <li key={item.id}>
                  <Link
                    to={item.path}
                    className={`group flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      itemIsActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'hover:bg-slate-800 dark:hover:bg-slate-900 text-slate-300 dark:text-slate-400 hover:text-white'
                    }`}
                    onClick={handleNavClick}
                    title={isSidebarCollapsed ? item.label : ''}
                  >
                    <div
                      className={`transition-all duration-200 ${
                        itemIsActive
                          ? 'text-white scale-110'
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-400 group-hover:scale-105'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <span
                      className={`text-sm font-medium transition-all duration-300 ${
                        itemIsActive ? 'font-semibold text-white' : 'group-hover:font-semibold'
                      } ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info Section */}
        {!isSidebarCollapsed && (
          <div className="px-4 py-4 border-t border-slate-700 dark:border-slate-800 bg-slate-800/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-semibold">
                {user?.fullName?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.fullName || AR_LABELS.admin}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {AR_LABELS.admin}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Logout Button - Fixed at bottom */}
        <div className="px-3 py-4 border-t border-slate-700 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 flex-shrink-0">
          <button
            onClick={handleLogout}
            className={`group flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900`}
            title={isSidebarCollapsed ? AR_LABELS.logout : ''}
            aria-label={AR_LABELS.logout}
          >
            <div className="transition-all duration-200 text-red-400 group-hover:scale-110">
              <LogoutIcon className="h-5 w-5" />
            </div>
            <span
              className={`text-sm font-medium transition-all duration-300 ${
                isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}
            >
              {AR_LABELS.logout}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;

