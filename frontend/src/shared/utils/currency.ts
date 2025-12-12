/**
 * Currency configuration interface
 */
export interface CurrencyConfig {
  code: string; // ISO currency code (e.g., 'SAR', 'USD', 'EUR')
  symbol: string; // Currency symbol (e.g., 'ر.س', '$', '€')
  name: string; // Currency name (e.g., 'Saudi Riyal', 'US Dollar')
}

/**
 * Common currency configurations
 */
export const CURRENCIES: Record<string, CurrencyConfig> = {
  SAR: { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  EGP: { code: 'EGP', symbol: 'ج.م', name: 'Egyptian Pound' },
  JOD: { code: 'JOD', symbol: 'د.أ', name: 'Jordanian Dinar' },
  KWD: { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  BHD: { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar' },
  OMR: { code: 'OMR', symbol: 'ر.ع', name: 'Omani Rial' },
  QAR: { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
};

/**
 * Default currency configuration
 */
export const DEFAULT_CURRENCY: CurrencyConfig = CURRENCIES.SAR;

/**
 * Parse currency from settings value
 * Expected format: "CODE|SYMBOL|NAME" or just "CODE"
 */
export const parseCurrencyFromSettings = (value: string | null | undefined): CurrencyConfig => {
  if (!value) {
    return DEFAULT_CURRENCY;
  }

  // Check if it's in format "CODE|SYMBOL|NAME"
  if (value.includes('|')) {
    const parts = value.split('|');
    if (parts.length >= 3) {
      return {
        code: parts[0].trim(),
        symbol: parts[1].trim(),
        name: parts[2].trim(),
      };
    }
  }

  // Check if it's a known currency code
  const upperValue = value.toUpperCase().trim();
  if (CURRENCIES[upperValue]) {
    return CURRENCIES[upperValue];
  }

  // If it's just a symbol, try to find matching currency
  const found = Object.values(CURRENCIES).find(c => c.symbol === value);
  if (found) {
    return found;
  }

  // Default fallback - assume it's a custom currency
  return {
    code: upperValue || 'SAR',
    symbol: value,
    name: value,
  };
};

/**
 * Format currency value to settings string
 */
export const formatCurrencyToSettings = (currency: CurrencyConfig): string => {
  return `${currency.code}|${currency.symbol}|${currency.name}`;
};

/**
 * Format a number as currency
 * @param value - The numeric value to format
 * @param currency - Currency configuration (defaults to SAR)
 * @param options - Additional formatting options
 */
export const formatCurrency = (
  value: number,
  currency: CurrencyConfig = DEFAULT_CURRENCY,
  options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showSymbol?: boolean;
  }
): string => {
  const {
    locale = 'ar-SA',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSymbol = true,
  } = options || {};

  try {
    // Try to use Intl.NumberFormat with currency code
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits,
      maximumFractionDigits,
    });

    const formatted = formatter.format(value);

    // If the formatter doesn't produce the desired symbol, replace it
    if (showSymbol && !formatted.includes(currency.symbol)) {
      // Replace the default symbol with our custom symbol
      return formatted.replace(/[^\d.,\s-]/g, currency.symbol);
    }

    return formatted;
  } catch (error) {
    // Fallback formatting if Intl.NumberFormat fails
    const formattedValue = value.toFixed(maximumFractionDigits);
    return showSymbol ? `${formattedValue} ${currency.symbol}` : formattedValue;
  }
};

/**
 * Format currency with custom symbol placement
 * @param value - The numeric value to format
 * @param currency - Currency configuration
 * @param position - 'before' or 'after' (default: 'after' for Arabic)
 */
export const formatCurrencyCustom = (
  value: number,
  currency: CurrencyConfig = DEFAULT_CURRENCY,
  position: 'before' | 'after' = 'after'
): string => {
  const formattedValue = value.toFixed(2);
  return position === 'before'
    ? `${currency.symbol} ${formattedValue}`
    : `${formattedValue} ${currency.symbol}`;
};

