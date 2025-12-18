// Global custom hooks
import { useState, useEffect } from 'react';

// Theme management hook
export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, setTheme, toggleTheme };
};

// Local storage hook
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
};

// Debounce hook
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Responsive view mode hook
// Automatically switches between grid (small screens) and table (large screens)
// Allows manual override which persists across screen size changes
export const useResponsiveViewMode = (
  storageKey?: string,
  defaultLargeScreenView: 'grid' | 'table' = 'table',
  defaultSmallScreenView: 'grid' | 'table' = 'grid'
) => {
  // Check if screen is large (>= 768px, Tailwind's md breakpoint)
  const [isLargeScreen, setIsLargeScreen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 768px)').matches;
  });

  // Track manual override
  const [manualOverride, setManualOverride] = useState<'grid' | 'table' | null>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`viewMode_${storageKey}`);
        if (saved === 'grid' || saved === 'table') {
          return saved;
        }
      } catch (error) {
        console.error('Error reading view mode from localStorage:', error);
      }
    }
    return null;
  });

  // Update screen size on resize
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsLargeScreen(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Calculate current view mode
  const currentViewMode: 'grid' | 'table' = manualOverride !== null
    ? manualOverride
    : isLargeScreen
    ? defaultLargeScreenView
    : defaultSmallScreenView;

  // Setter function that allows manual override
  const setViewMode = (mode: 'grid' | 'table' | null) => {
    if (mode === null) {
      // Clear manual override, return to responsive behavior
      setManualOverride(null);
      if (storageKey) {
        try {
          localStorage.removeItem(`viewMode_${storageKey}`);
        } catch (error) {
          console.error('Error removing view mode from localStorage:', error);
        }
      }
    } else {
      // Set manual override
      setManualOverride(mode);
      if (storageKey) {
        try {
          localStorage.setItem(`viewMode_${storageKey}`, mode);
        } catch (error) {
          console.error('Error saving view mode to localStorage:', error);
        }
      }
    }
  };

  return {
    viewMode: currentViewMode,
    setViewMode,
    isLargeScreen,
    isManualOverride: manualOverride !== null,
  };
};
