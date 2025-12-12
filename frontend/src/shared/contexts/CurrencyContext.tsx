import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CurrencyConfig, DEFAULT_CURRENCY, parseCurrencyFromSettings, formatCurrency as formatCurrencyUtil } from '../utils/currency';
import { getSetting, updateSetting } from '../utils/settingsStorage';

interface CurrencyContextType {
  currency: CurrencyConfig;
  loading: boolean;
  updateCurrency: (currency: CurrencyConfig) => Promise<void>;
  formatCurrency: (value: number, options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showSymbol?: boolean;
  }) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [currency, setCurrency] = useState<CurrencyConfig>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);

  // Load currency from localStorage on mount
  useEffect(() => {
    const loadCurrency = () => {
      try {
        // Get defaultCurrency from localStorage settings
        const defaultCurrency = getSetting<string>('defaultCurrency', '', null);
        
        if (defaultCurrency) {
          const parsedCurrency = parseCurrencyFromSettings(defaultCurrency);
          setCurrency(parsedCurrency);
        } else {
          setCurrency(DEFAULT_CURRENCY);
        }
      } catch (error: any) {
        console.error('Error loading currency from localStorage:', error);
        setCurrency(DEFAULT_CURRENCY);
      } finally {
        setLoading(false);
      }
    };

    loadCurrency();
  }, []);

  // Update currency in localStorage
  const updateCurrency = async (newCurrency: CurrencyConfig) => {
    try {
      // Update defaultCurrency in settings
      updateSetting('defaultCurrency', newCurrency.symbol, null);
      
      setCurrency(newCurrency);
    } catch (error) {
      console.error('Error updating currency in localStorage:', error);
      throw error;
    }
  };

  // Format currency helper
  const formatCurrencyValue = (
    value: number,
    options?: {
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
      showSymbol?: boolean;
    }
  ): string => {
    return formatCurrencyUtil(value, currency, { locale: 'ar-SA', ...options });
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        loading,
        updateCurrency,
        formatCurrency: formatCurrencyValue,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

