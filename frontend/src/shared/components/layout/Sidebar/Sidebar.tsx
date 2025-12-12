import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NavItem } from '@/shared/constants';
import { AR_LABELS, NAV_ITEMS, ChevronDownIcon } from '@/shared/constants';
import { useAppStore, useAuthStore } from '@/app/store';
import { useDropdown } from '@/shared/contexts/DropdownContext';
import { LogoutIcon, MobileRechargeIcon, LinkPayIcon } from '@/shared/assets/icons';
import { hasRoutePermission } from '@/shared/utils/permissions';
import { RechargeModal } from '@/shared/components/ui';

interface SidebarProps {
  activePath: string;
  setActivePath: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSidebarCollapsed, toggleSidebar } = useAppStore();
  const { setOpenDropdownId, closeAllDropdowns } = useDropdown();
  const { logout, user } = useAuthStore();
  const [openDropdowns, setOpenDropdowns] = useState<Record<number, boolean>>({});
  const [activePopoverId, setActivePopoverId] = useState<number | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<Record<number, { top: number; right: number }>>({});
  const dropdownRefs = React.useRef<Record<number, HTMLElement | null>>({});
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);

  // Filter navigation items based on user permissions
  const filteredNavItems = useMemo(() => {
    // Admin users see all items
    if (user?.role === 'Admin') {
      return NAV_ITEMS;
    }

    const userPermissions = user?.permissions || [];
    
    return NAV_ITEMS.filter(item => {
      // Filter dropdown items
      if (item.isDropdown && item.dropdownItems) {
        const filteredDropdownItems = item.dropdownItems.filter(subItem => 
          hasRoutePermission(subItem.path, userPermissions, user?.role)
        );
        // Include dropdown if it has at least one accessible item
        return filteredDropdownItems.length > 0;
      }
      
      // Check permission for regular items
      return hasRoutePermission(item.path, userPermissions, user?.role);
    }).map(item => {
      // Filter dropdown items for items that passed the filter
      if (item.isDropdown && item.dropdownItems) {
        const filteredDropdownItems = item.dropdownItems.filter(subItem => 
          hasRoutePermission(subItem.path, userPermissions, user?.role)
        );
        return {
          ...item,
          dropdownItems: filteredDropdownItems
        };
      }
      return item;
    });
  }, [user]);

  const toggleDropdown = (id: number) => {
    const dropdownId = `sidebar-dropdown-${id}`;
    
    if (isSidebarCollapsed) {
      // When collapsed, toggle popover and calculate position
      if (activePopoverId === id) {
        setActivePopoverId(null);
        setOpenDropdownId(null);
      } else {
        closeAllDropdowns();
        const element = dropdownRefs.current[id];
        if (element) {
          const rect = element.getBoundingClientRect();
          const collapsedSidebarWidth = 80; // w-20 = 80px
          const gap = 8; // 8px gap between sidebar and popover
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Calculate position to prevent overflow
          let right = collapsedSidebarWidth + gap;
          let top = rect.top;
          
          // Ensure popover doesn't overflow viewport
          if (rect.top + 300 > viewportHeight) {
            top = Math.max(8, viewportHeight - 300);
          }
          if (top < 0) {
            top = 8;
          }
          
          setPopoverPosition(prev => ({
            ...prev,
            [id]: {
              top,
              right,
            },
          }));
        }
        setActivePopoverId(id);
        setOpenDropdownId(dropdownId);
      }
    } else {
      // When expanded, toggle inline dropdown
      if (openDropdowns[id]) {
        setOpenDropdowns(prev => ({ ...prev, [id]: false }));
        setOpenDropdownId(null);
      } else {
        closeAllDropdowns();
        setOpenDropdowns(prev => ({ ...prev, [id]: true }));
        setOpenDropdownId(dropdownId);
      }
    }
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('.sidebar-container')) {
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

  // Close popover when clicking outside when sidebar is collapsed
  useEffect(() => {
    if (!isSidebarCollapsed || activePopoverId === null) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      const dropdownElement = dropdownRefs.current[activePopoverId];
      
      if (
        dropdownElement &&
        !dropdownElement.contains(target) &&
        !target.closest('.sidebar-dropdown-popover')
      ) {
        setActivePopoverId(null);
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isSidebarCollapsed, activePopoverId, setOpenDropdownId]);

  // Close popover when sidebar expands
  useEffect(() => {
    if (!isSidebarCollapsed) {
      setActivePopoverId(null);
      setOpenDropdownId(null);
    }
  }, [isSidebarCollapsed, setOpenDropdownId]);

  // Update popover position on scroll
  useEffect(() => {
    if (!isSidebarCollapsed || activePopoverId === null) return;

    const updatePosition = () => {
      const element = dropdownRefs.current[activePopoverId];
      if (element) {
        const rect = element.getBoundingClientRect();
        const collapsedSidebarWidth = 80;
        const gap = 8;
        setPopoverPosition(prev => ({
          ...prev,
          [activePopoverId]: {
            top: rect.top,
            right: collapsedSidebarWidth + gap,
          },
        }));
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isSidebarCollapsed, activePopoverId]);

  // Close popover on route change
  useEffect(() => {
    setActivePopoverId(null);
    setOpenDropdownId(null);
  }, [location.pathname, setOpenDropdownId]);

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

  // Helper function to determine if a nav item (including dropdowns) should be visually active.
  const isItemActive = (item: NavItem): boolean => {
    // A dropdown is active if its own path matches or if any of its children's paths match.
    if (item.isDropdown) {
      return item.path === location.pathname || (item.dropdownItems?.some(sub => sub.path === location.pathname) ?? false);
    }
    // A regular item is active if its path matches.
    return item.path === location.pathname;
  };

  const handleNavClick = () => {
    onClose(); // Close sidebar after navigation on mobile
    setActivePopoverId(null); // Close popover after navigation
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

      {/* Sidebar */}
      <aside
        className={`sidebar-container fixed top-0 right-0 h-screen flex flex-col z-40 transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } ${isSidebarCollapsed ? 'w-20 lg:w-20' : 'w-72 lg:w-64'} ${
          'bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl'
        }`}
      >
        {/* Logo Section with Toggle Button */}
        <div className="relative px-4 py-5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start gap-3'}`}>
            {/* Toggle Button - Visible on all screen sizes */}
            <button
              onClick={toggleSidebar}
              className="group flex items-center justify-center w-9 h-9 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-gray-800 hover:text-orange-600 dark:hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 flex-shrink-0"
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
            <span className={`text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 bg-clip-text text-transparent transition-all duration-300 whitespace-nowrap ${
              isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}>
              PoshPointHub
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-grow overflow-y-auto px-3 py-4 custom-scrollbar">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const itemIsActive = isItemActive(item);
              return (
                <li key={item.id}>
                  {item.isDropdown ? (
                    <div
                      ref={(el) => {
                        dropdownRefs.current[item.id] = el;
                      }}
                      className={`group relative flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                        itemIsActive
                          ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 shadow-sm'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                      onClick={() => toggleDropdown(item.id)}
                      title={isSidebarCollapsed ? item.label : ''}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`transition-all duration-200 ${
                            itemIsActive
                              ? 'text-orange-600 dark:text-orange-400 scale-110'
                              : 'text-gray-500 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:scale-105'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <span
                          className={`text-sm font-medium transition-all duration-300 ${
                            itemIsActive ? 'font-semibold text-orange-600 dark:text-orange-400' : 'group-hover:font-semibold'
                          } ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}
                        >
                          {item.label}
                        </span>
                      </div>
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-all duration-300 ${
                          openDropdowns[item.id] ? 'rotate-180' : ''
                        } ${itemIsActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400'} ${
                          isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                        }`}
                      />
                    </div>
                  ) : (
                    <Link
                      to={item.path}
                      className={`group flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        itemIsActive
                          ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 shadow-sm'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                      onClick={handleNavClick}
                      title={isSidebarCollapsed ? item.label : ''}
                    >
                      <div
                        className={`transition-all duration-200 ${
                          itemIsActive
                            ? 'text-orange-600 dark:text-orange-400 scale-110'
                            : 'text-gray-500 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:scale-105'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <span
                        className={`text-sm font-medium transition-all duration-300 ${
                          itemIsActive ? 'font-semibold text-orange-600 dark:text-orange-400' : 'group-hover:font-semibold'
                        } ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  )}
                  {/* Inline dropdown when expanded */}
                  {item.isDropdown && !isSidebarCollapsed && (
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        openDropdowns[item.id] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <ul className="pr-8 pt-2 pb-1 space-y-0.5">
                        {item.dropdownItems?.map(subItem => (
                          <li key={subItem.id}>
                            <Link
                              to={subItem.path}
                              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group ${
                                location.pathname === subItem.path
                                  ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 shadow-sm'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'
                              }`}
                              onClick={handleNavClick}
                            >
                              <div
                                className={`transition-all duration-200 ${
                                  location.pathname === subItem.path
                                    ? 'text-orange-600 dark:text-orange-400 scale-105'
                                    : 'text-gray-400 dark:text-gray-500 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:scale-105'
                                }`}
                              >
                                {subItem.icon}
                              </div>
                              <span className={`text-sm font-medium ${location.pathname === subItem.path ? 'font-semibold' : ''}`}>
                                {subItem.label}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Popover dropdown when collapsed */}
                  {item.isDropdown && isSidebarCollapsed && activePopoverId === item.id && popoverPosition[item.id] && (
                    <div
                      className="sidebar-dropdown-popover fixed z-[60] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 min-w-[200px] max-w-[calc(100vw-120px)] max-h-[calc(100vh-16px)] overflow-hidden transition-all duration-200 opacity-100 transform translate-x-0"
                      style={{
                        top: `${popoverPosition[item.id].top}px`,
                        right: `${popoverPosition[item.id].right}px`,
                      }}
                    >
                      <div className="p-2">
                        <div className="px-3 py-2 mb-1 border-b border-gray-200 dark:border-gray-800">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
                          <ul className="space-y-0.5">
                            {item.dropdownItems?.map(subItem => (
                              <li key={subItem.id}>
                                <Link
                                  to={subItem.path}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group touch-manipulation ${
                                    location.pathname === subItem.path
                                      ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 shadow-sm'
                                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'
                                  }`}
                                  onClick={handleNavClick}
                                >
                                  <div
                                    className={`transition-all duration-200 ${
                                      location.pathname === subItem.path
                                        ? 'text-orange-600 dark:text-orange-400 scale-105'
                                        : 'text-gray-400 dark:text-gray-500 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:scale-105'
                                    }`}
                                  >
                                    {subItem.icon}
                                  </div>
                                  <span className={`text-sm font-medium ${location.pathname === subItem.path ? 'font-semibold' : ''}`}>
                                    {subItem.label}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* LinkPay Button */}
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
          <button
            onClick={() => {
              window.open('https://b1.linkpay.ps/login/', '_blank', 'noopener,noreferrer');
              onClose(); // Close sidebar on mobile after opening link
            }}
            className={`group flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
            title={isSidebarCollapsed ? AR_LABELS.linkPay : ''}
            aria-label={AR_LABELS.linkPay}
          >
            <div className="transition-all duration-200 text-green-600 dark:text-green-400 group-hover:scale-110">
              <LinkPayIcon className="h-5 w-5" />
            </div>
            <span
              className={`text-sm font-medium transition-all duration-300 ${
                isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}
            >
              {AR_LABELS.linkPay}
            </span>
          </button>
        </div>

        {/* Recharge Mobile Balance Button */}
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
          <button
            onClick={() => {
              setIsRechargeModalOpen(true);
              onClose(); // Close sidebar on mobile after opening modal
            }}
            className={`group flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
            title={isSidebarCollapsed ? AR_LABELS.rechargeMobileBalance : ''}
            aria-label={AR_LABELS.rechargeMobileBalance}
          >
            <div className="transition-all duration-200 text-blue-600 dark:text-blue-400 group-hover:scale-110">
              <MobileRechargeIcon className="h-5 w-5" />
            </div>
            <span
              className={`text-sm font-medium transition-all duration-300 ${
                isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}
            >
              {AR_LABELS.rechargeMobileBalance}
            </span>
          </button>
        </div>

        {/* Logout Button - Fixed at bottom */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
          <button
            onClick={handleLogout}
            className={`group flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
            title={isSidebarCollapsed ? AR_LABELS.logout : ''}
            aria-label={AR_LABELS.logout}
          >
            <div className="transition-all duration-200 text-red-600 dark:text-red-400 group-hover:scale-110">
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

        {/* Copyright */}
        {!isSidebarCollapsed && (
          <div className="px-4 py-4 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 transition-all duration-300">
            <p className="font-medium mb-1 text-gray-700 dark:text-gray-300">{AR_LABELS.brandRestaurantAdmin}</p>
            <p className="text-gray-500 dark:text-gray-400">2023 {AR_LABELS.allRightsReserved}</p>
            <p className="mt-1.5 opacity-75">{AR_LABELS.madeWithLove}</p>
          </div>
        )}
      </aside>

      {/* Recharge Modal */}
      <RechargeModal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
      />
    </>
  );
};

export default Sidebar;