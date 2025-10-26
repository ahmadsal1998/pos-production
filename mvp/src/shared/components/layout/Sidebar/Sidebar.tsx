import { useState } from 'react';
import { NavItem } from '../../../types';
import { AR_LABELS, NAV_ITEMS, ChevronDownIcon } from '../../../constants';

interface SidebarProps {
  activePath: string;
  setActivePath: (path: string) => void;
}

const Sidebar = ({ activePath, setActivePath }: SidebarProps) => {
  const [openDropdowns, setOpenDropdowns] = useState<Record<number, boolean>>({});

  const toggleDropdown = (id: number) => {
    setOpenDropdowns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isItemActive = (item: NavItem): boolean => {
    if (item.isDropdown) {
      return (
        item.path === activePath ||
        (item.dropdownItems?.some(sub => sub.path === activePath) ?? false)
      );
    }
    return item.path === activePath;
  };

  return (
    <div className="flex h-screen w-64 flex-col overflow-hidden bg-slate-900 text-slate-100 shadow-2xl border-l border-slate-800/50">
      {/* Logo Section */}
      <div className="flex items-center justify-center border-b border-slate-800/60 p-6 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
            <span className="text-xl font-bold text-white">P</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-white tracking-tight">PoshPoint</span>
            <span className="text-xs text-slate-400 font-medium">نظام نقاط البيع</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="border-b border-slate-800/60 p-4 bg-slate-900/30 backdrop-blur-sm">
        <div className="relative group">
          <input
            type="text"
            placeholder="بحث سريع..."
            className="w-full rounded-xl bg-slate-800/60 py-3 pl-4 pr-12 text-sm text-slate-100 placeholder-slate-400 transition-all duration-300 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 border border-slate-700/50 hover:border-slate-600/50"
          />
          <div className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors duration-300">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-grow space-y-2 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {NAV_ITEMS.map(item => {
          const itemIsActive = isItemActive(item);
          return (
            <div key={item.id} className="space-y-1">
              <button
                className={`group flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                  itemIsActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 transform scale-[1.02]'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white hover:transform hover:scale-[1.01] active:scale-[0.99]'
                }`}
                onClick={() => {
                  if (item.isDropdown) {
                    toggleDropdown(item.id);
                  } else {
                    setActivePath(item.path);
                  }
                }}
              >
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className={`transition-colors duration-300 ${
                    itemIsActive 
                      ? 'text-white' 
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}>
                    {item.icon}
                  </div>
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.isDropdown && (
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-all duration-300 ${
                      openDropdowns[item.id] ? 'rotate-180' : ''
                    } ${
                      itemIsActive 
                        ? 'text-white' 
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                )}
              </button>
              
              {item.isDropdown && openDropdowns[item.id] && (
                <div className="space-y-1 pr-6 animate-in slide-in-from-top-2 duration-300">
                  {item.dropdownItems?.map(subItem => (
                    <button
                      key={subItem.id}
                      onClick={() => setActivePath(subItem.path)}
                      className={`group flex w-full items-center space-x-3 space-x-reverse rounded-lg px-4 py-2.5 text-sm transition-all duration-300 ${
                        activePath === subItem.path
                          ? 'bg-blue-500/20 text-blue-300 border-l-2 border-blue-500 shadow-sm'
                          : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 hover:border-l-2 hover:border-slate-600'
                      }`}
                    >
                      <div className={`transition-colors duration-300 ${
                        activePath === subItem.path 
                          ? 'text-blue-300' 
                          : 'text-slate-500 group-hover:text-slate-300'
                      }`}>
                        {subItem.icon}
                      </div>
                      <span className="font-medium">{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>



      {/* Copyright */}
      <div className="border-t border-slate-800/60 p-4 text-center bg-slate-900/50 backdrop-blur-sm">
        <p className="text-sm font-medium text-slate-300">© 2024 PoshPoint</p>
        <p className="mt-1 text-xs text-slate-500">{AR_LABELS.madeWithLove}</p>
      </div>
    </div>
  );
};

export default Sidebar;
