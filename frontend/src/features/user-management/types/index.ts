// User management feature types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string; // Computed field
  username: string;
  phone: string;
  role: SystemRole;
  status: UserStatus;
  permissions: ScreenPermission[];
  createdAt: string;
  lastLogin?: string;
}

export type SystemRole = 'admin' | 'manager' | 'cashier';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type ScreenPermission = 
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'brands'
  | 'sales_today'
  | 'sales_history'
  | 'pos_retail'
  | 'pos_wholesale'
  | 'refunds'
  | 'preferences'
  | 'users'
  | 'purchases'
  | 'expenses';

export interface SystemPreferences {
  businessName: string;
  logoUrl: string;
  defaultCurrency: string;
  dateFormat: string;
  timeFormat: string;
  defaultLanguage: string;
  vatPercentage: number;
  invoiceNumberFormat: string;
  invoiceFooterText: string;
  autoPrintInvoice: boolean;
  sellWithoutStock: boolean;
  allowSellingZeroStock: boolean;
  sessionDuration: number;
  allowUserCreation: boolean;
  defaultUnits: string;
  minStockLevel: number;
  enableLowStockNotifications: boolean;
  allowCash: boolean;
  allowCard: boolean;
  allowCredit: boolean;
  enableOverdueNotifications: boolean;
  enableAutoNotifications: boolean;
  interfaceMode: 'light' | 'dark';
  // Print Settings
  printerType?: 'A4' | 'A3' | 'Thermal 80mm' | 'Thermal 58mm'; // Printer type selector - auto-configures all print settings
  printPaperSize: 'A4' | 'A5' | '80mm' | '58mm' | 'custom';
  printPaperWidth?: number; // in mm, for custom size
  printPaperHeight?: number; // in mm, for custom size
  printMarginTop: number; // in cm
  printMarginBottom: number; // in cm
  printMarginLeft: number; // in cm
  printMarginRight: number; // in cm
  printFontSize: number; // in px
  printTableFontSize: number; // in px
  printShowBorders: boolean;
  printCompactMode: boolean;
  printOrientation?: 'portrait' | 'landscape'; // Page orientation
  printMaxColumns?: number; // Maximum number of columns in table
  // Business Day Configuration
  businessDayStartTime: string; // Format: "HH:mm" (e.g., "06:00")
  businessDayTimezone: string; // IANA timezone (e.g., "Asia/Gaza", "America/New_York")
  // Store Address
  storeAddress: string; // Store location/address for invoices
}

export interface ProfileFormFields {
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  city: string;
  country: string;
}

export const ALL_PERMISSIONS: ScreenPermission[] = [
  'dashboard',
  'products',
  'categories',
  'brands',
  'sales_today',
  'sales_history',
  'pos_retail',
  'pos_wholesale',
  'refunds',
  'preferences',
  'users',
  'purchases',
  'expenses',
];