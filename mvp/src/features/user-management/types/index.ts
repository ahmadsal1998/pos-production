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
  defaultCurrency: string;
  dateFormat: string;
  timeFormat: string;
  defaultLanguage: string;
  vatPercentage: number;
  invoiceNumberFormat: string;
  invoiceFooterText: string;
  autoPrintInvoice: boolean;
  sellWithoutStock: boolean;
  sessionDuration: number;
  allowUserCreation: boolean;
  defaultUnits: string;
  minStockLevel: number;
  enableLowStockNotifications: boolean;
  allowCash: boolean;
  allowCard: boolean;
  allowCredit: boolean;
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