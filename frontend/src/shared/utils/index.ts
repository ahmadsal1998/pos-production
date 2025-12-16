// Core utility functions
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const truncate = (str: string, length: number): string => {
  return str.length > length ? str.substring(0, length) + '...' : str;
};

export const isEmpty = (value: any): boolean => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Formats a date to dd-mm-yyyy format
 * @param date - Date object, string, or number (timestamp)
 * @returns Formatted date string in dd-mm-yyyy format
 */
export const formatDate = (date: Date | string | number): string => {
  const d = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  if (isNaN(d.getTime())) {
    return '';
  }
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
};

// Export currency utilities
export * from './currency';

// Export sales storage utilities
export * from './salesStorage';

// Export settings storage utilities
export * from './settingsStorage';

// Export sound utilities
export * from './soundUtils';

/**
 * Converts Arabic numerals (٠-٩) to English numerals (0-9)
 * @param text - The text containing Arabic numerals
 * @returns The text with Arabic numerals converted to English
 */
export const convertArabicToEnglishNumerals = (text: string): string => {
  const arabicToEnglish: { [key: string]: string } = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
    '٫': '.',
    '٬': ','
  };
  
  return text.replace(/[٠-٩٫٬]/g, (char) => arabicToEnglish[char] || char);
};

/**
 * Formats a number with English numerals (always uses 0-9, never Arabic numerals)
 * @param value - The number to format
 * @param options - Formatting options (decimals, locale, etc.)
 * @returns Formatted number string with English numerals
 */
export const formatNumber = (
  value: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    useGrouping?: boolean;
  }
): string => {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    useGrouping = true,
  } = options || {};

  try {
    // Use 'en-US' locale to ensure English numerals
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping,
    });

    let formatted = formatter.format(value);

    // Safety check: convert any Arabic numerals to English
    formatted = convertArabicToEnglishNumerals(formatted);

    return formatted;
  } catch (error) {
    // Fallback: use simple toFixed and ensure English numerals
    const formatted = value.toFixed(maximumFractionDigits);
    return convertArabicToEnglishNumerals(formatted);
  }
};
