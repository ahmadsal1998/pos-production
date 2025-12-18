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
export const DEFAULT_CURRENCY: CurrencyConfig = CURRENCIES.ILS;

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
    code: upperValue || 'ILS',
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
 * Convert Arabic numerals to English numerals
 * @param str - String that may contain Arabic numerals
 * @returns String with English numerals
 */
const convertArabicToEnglishNumerals = (str: string): string => {
  const arabicToEnglish: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '٫': '.', '٬': ','
  };
  
  return str.replace(/[٠-٩٫٬]/g, (char) => arabicToEnglish[char] || char);
};

/**
 * Format a number as currency
 * @param value - The numeric value to format
 * @param currency - Currency configuration (defaults to ILS)
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
    forceEnglishNumerals?: boolean; // New option to force English numerals
  }
): string => {
  const {
    locale = 'ar-SA',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSymbol = true,
    forceEnglishNumerals = true, // Default to true to always use English numerals
  } = options || {};

  try {
    // Use 'en-US' locale for number formatting to ensure English numerals
    const numberLocale = forceEnglishNumerals ? 'en-US' : locale;
    
    // Format the number part only (without currency symbol) to ensure English numerals
    const numberFormatter = new Intl.NumberFormat(numberLocale, {
      minimumFractionDigits,
      maximumFractionDigits,
    });

    let numberPart = numberFormatter.format(value);

    // Convert Arabic numerals to English if they appear (safety check)
    if (forceEnglishNumerals) {
      numberPart = convertArabicToEnglishNumerals(numberPart);
    }

    // Add currency symbol if needed
    if (showSymbol) {
      // Determine symbol position based on locale (Arabic typically has symbol after)
      const isRTL = locale === 'ar-SA' || locale.startsWith('ar');
      return isRTL ? `${numberPart} ${currency.symbol}` : `${currency.symbol} ${numberPart}`;
    }

    return numberPart;
  } catch (error) {
    // Fallback formatting if Intl.NumberFormat fails
    const formattedValue = value.toFixed(maximumFractionDigits);
    const numberPart = forceEnglishNumerals ? convertArabicToEnglishNumerals(formattedValue) : formattedValue;
    const result = showSymbol ? `${numberPart} ${currency.symbol}` : numberPart;
    return result;
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

