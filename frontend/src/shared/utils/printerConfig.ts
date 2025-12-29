/**
 * Printer Configuration Utility
 * 
 * Provides pre-configured print settings for different printer types.
 * When a printer type is selected, all settings are automatically adjusted.
 */

import { SystemPreferences } from '@/features/user-management/types';

export type PrinterType = 'A4' | 'A3' | 'Thermal 80mm' | 'Thermal 58mm';

export interface PrinterConfig {
  printerType: PrinterType;
  paperSize: string;
  paperWidth: number; // in mm
  paperHeight: number; // in mm
  marginTop: number; // in cm
  marginBottom: number; // in cm
  marginLeft: number; // in cm
  marginRight: number; // in cm
  fontSize: number; // in px
  tableFontSize: number; // in px
  showBorders: boolean;
  compactMode: boolean;
  orientation: 'portrait' | 'landscape';
  maxColumns: number; // Maximum number of columns in table
  description: string;
}

/**
 * Pre-configured settings for each printer type
 */
export const PRINTER_CONFIGS: Record<PrinterType, PrinterConfig> = {
  'A4': {
    printerType: 'A4',
    paperSize: 'A4',
    paperWidth: 210,
    paperHeight: 297,
    marginTop: 1.0,
    marginBottom: 1.0,
    marginLeft: 1.0,
    marginRight: 1.0,
    fontSize: 13,
    tableFontSize: 12,
    showBorders: true,
    compactMode: false,
    orientation: 'portrait',
    maxColumns: 4,
    description: 'A4 paper (210 × 297 mm) - Standard office printer',
  },
  'A3': {
    printerType: 'A3',
    paperSize: 'A3',
    paperWidth: 297,
    paperHeight: 420,
    marginTop: 1.2,
    marginBottom: 1.2,
    marginLeft: 1.2,
    marginRight: 1.2,
    fontSize: 14,
    tableFontSize: 13,
    showBorders: true,
    compactMode: false,
    orientation: 'portrait',
    maxColumns: 5,
    description: 'A3 paper (297 × 420 mm) - Large format printer',
  },
  'Thermal 80mm': {
    printerType: 'Thermal 80mm',
    paperSize: '80mm',
    paperWidth: 80,
    paperHeight: 0, // Auto height for thermal
    marginTop: 0.3,
    marginBottom: 0.3,
    marginLeft: 0.2,
    marginRight: 0.2,
    fontSize: 10,
    tableFontSize: 9,
    showBorders: true,
    compactMode: true,
    orientation: 'portrait',
    maxColumns: 3,
    description: 'Thermal printer 80mm width - Receipt printer',
  },
  'Thermal 58mm': {
    printerType: 'Thermal 58mm',
    paperSize: '58mm',
    paperWidth: 58,
    paperHeight: 0, // Auto height for thermal
    marginTop: 0.2,
    marginBottom: 0.2,
    marginLeft: 0.15,
    marginRight: 0.15,
    fontSize: 9,
    tableFontSize: 8,
    showBorders: true,
    compactMode: true,
    orientation: 'portrait',
    maxColumns: 3,
    description: 'Thermal printer 58mm width - Small receipt printer',
  },
};

/**
 * Get printer configuration for a specific printer type
 */
export const getPrinterConfig = (printerType: PrinterType): PrinterConfig => {
  return PRINTER_CONFIGS[printerType];
};

/**
 * Apply printer configuration to system preferences
 * This automatically sets all print-related settings based on printer type
 */
export const applyPrinterConfig = (
  printerType: PrinterType,
  currentSettings?: Partial<SystemPreferences>
): Partial<SystemPreferences> => {
  const config = getPrinterConfig(printerType);
  
  return {
    ...currentSettings,
    // Store the printer type
    printerType: printerType as any, // Will be added to SystemPreferences type
    // Apply all print settings from configuration
    printPaperSize: config.paperSize as any,
    printPaperWidth: config.paperWidth,
    printPaperHeight: config.paperHeight,
    printMarginTop: config.marginTop,
    printMarginBottom: config.marginBottom,
    printMarginLeft: config.marginLeft,
    printMarginRight: config.marginRight,
    printFontSize: config.fontSize,
    printTableFontSize: config.tableFontSize,
    printShowBorders: config.showBorders,
    printCompactMode: config.compactMode,
    // Store orientation and maxColumns for future use
    printOrientation: config.orientation as any,
    printMaxColumns: config.maxColumns as any,
  };
};

/**
 * Get print settings with printer type awareness
 * Falls back to defaults if printer type not set
 */
export const getPrintSettingsFromConfig = (
  settings?: SystemPreferences | null
): PrinterConfig => {
  // Check if printerType is set in settings
  const printerType = (settings as any)?.printerType as PrinterType | undefined;
  
  if (printerType && PRINTER_CONFIGS[printerType]) {
    return PRINTER_CONFIGS[printerType];
  }
  
  // Fallback: Try to infer from paperSize
  const paperSize = settings?.printPaperSize || 'A4';
  if (paperSize === 'A4') {
    return PRINTER_CONFIGS['A4'];
  } else if (paperSize === 'A3') {
    return PRINTER_CONFIGS['A3'];
  } else if (paperSize === '80mm') {
    return PRINTER_CONFIGS['Thermal 80mm'];
  } else if (paperSize === '58mm') {
    return PRINTER_CONFIGS['Thermal 58mm'];
  }
  
  // Default to A4
  return PRINTER_CONFIGS['A4'];
};

/**
 * Get all available printer types
 */
export const getAvailablePrinterTypes = (): PrinterType[] => {
  return Object.keys(PRINTER_CONFIGS) as PrinterType[];
};

/**
 * Check if current settings match the printer configuration
 * Returns an object indicating which settings have been manually overridden
 */
export const checkSettingsMatch = (
  printerType: PrinterType | undefined,
  currentSettings: Partial<SystemPreferences>
): {
  matches: boolean;
  overriddenSettings: string[];
} => {
  if (!printerType || !PRINTER_CONFIGS[printerType]) {
    return { matches: true, overriddenSettings: [] };
  }

  const config = PRINTER_CONFIGS[printerType];
  const overridden: string[] = [];

  // Check critical settings that should match the printer config
  if (currentSettings.printPaperSize && currentSettings.printPaperSize !== config.paperSize) {
    overridden.push('حجم الورق');
  }
  if (currentSettings.printPaperWidth && currentSettings.printPaperWidth !== config.paperWidth) {
    overridden.push('عرض الورق');
  }
  if (currentSettings.printPaperHeight && currentSettings.printPaperHeight !== config.paperHeight) {
    overridden.push('ارتفاع الورق');
  }
  if (currentSettings.printMarginTop !== undefined && Math.abs(currentSettings.printMarginTop - config.marginTop) > 0.1) {
    overridden.push('الهامش العلوي');
  }
  if (currentSettings.printMarginBottom !== undefined && Math.abs(currentSettings.printMarginBottom - config.marginBottom) > 0.1) {
    overridden.push('الهامش السفلي');
  }
  if (currentSettings.printMarginLeft !== undefined && Math.abs(currentSettings.printMarginLeft - config.marginLeft) > 0.1) {
    overridden.push('الهامش الأيسر');
  }
  if (currentSettings.printMarginRight !== undefined && Math.abs(currentSettings.printMarginRight - config.marginRight) > 0.1) {
    overridden.push('الهامش الأيمن');
  }
  if (currentSettings.printFontSize && Math.abs(currentSettings.printFontSize - config.fontSize) > 1) {
    overridden.push('حجم الخط');
  }
  if (currentSettings.printTableFontSize && Math.abs(currentSettings.printTableFontSize - config.tableFontSize) > 1) {
    overridden.push('حجم خط الجدول');
  }
  if (currentSettings.printCompactMode !== undefined && currentSettings.printCompactMode !== config.compactMode) {
    overridden.push('وضع المدمج');
  }
  if (currentSettings.printShowBorders !== undefined && currentSettings.printShowBorders !== config.showBorders) {
    overridden.push('إظهار الحدود');
  }

  return {
    matches: overridden.length === 0,
    overriddenSettings: overridden,
  };
};

/**
 * Get printer type display name
 */
export const getPrinterTypeDisplayName = (printerType: PrinterType): string => {
  return PRINTER_CONFIGS[printerType].description;
};

