// --- USER MANAGEMENT INTERFACES ---
export type SystemRole = 'Admin' | 'Manager' | 'Cashier';

export type ScreenPermission = 
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'brands'
  | 'purchases'
  | 'expenses'
  | 'salesToday'
  | 'salesHistory'
  | 'posRetail'
  | 'posWholesale'
  | 'refunds'
  | 'preferences'
  | 'users';

export const ALL_PERMISSIONS: ScreenPermission[] = [
  'dashboard',
  'products',
  'categories',
  'brands',
  'purchases',
  'expenses',
  'salesToday',
  'salesHistory',
  'posRetail',
  'posWholesale',
  'refunds',
  'preferences',
  'users'
];

export interface User {
  id: string;
  fullName: string;
  username: string; // or email
  password?: string; // Only for form handling
  role: SystemRole;
  permissions: ScreenPermission[];
  createdAt: string; // ISO date string
  lastLogin: string | null; // ISO date string or null
  status: 'Active' | 'Inactive';
}
