import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CurrencyConfig, DEFAULT_CURRENCY, parseCurrencyFromSettings, formatCurrency as formatCurrencyUtil } from '../utils/currency';
import { adminApi, storeSettingsApi } from '@/lib/api/client';

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

  // Load currency from settings on mount
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        // Store-specific only. Try dedicated key first, then fall back to full settings map.
        const response = await storeSettingsApi.getSetting('currency');

        const currencyValue =
          response?.data?.data?.setting?.value ??
          null;

        if (currencyValue) {
          const parsedCurrency = parseCurrencyFromSettings(currencyValue);
          setCurrency(parsedCurrency);
        } else {
          // Fallback: fetch all settings and try common keys (currency/defaultCurrency)
          const allSettingsResp = await storeSettingsApi.getSettings();
          const settings =
            (allSettingsResp.data as any)?.data?.settings ||
            (allSettingsResp.data as any)?.settings ||
            {};
          const fallbackCurrency = settings.currency || settings.defaultCurrency;
          if (fallbackCurrency) {
            const parsedCurrency = parseCurrencyFromSettings(fallbackCurrency);
            setCurrency(parsedCurrency);
          } else {
            setCurrency(DEFAULT_CURRENCY);
          }
        }
      } catch (error: any) {
        setCurrency(DEFAULT_CURRENCY);
      } finally {
        setLoading(false);
      }
    };

    loadCurrency();
  }, []);

  // Update currency in settings (store-specific only)
  const updateCurrency = async (newCurrency: CurrencyConfig) => {
    try {
      const currencyString = `${newCurrency.code}|${newCurrency.symbol}|${newCurrency.name}`;
      
      await storeSettingsApi.updateSetting('currency', {
        value: currencyString,
        description: 'Default currency for the store',
      });
      
      setCurrency(newCurrency);
    } catch (error) {
      console.error('Error updating currency settings:', error);
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

