// --- USER MANAGEMENT INTERFACES ---
export type SystemRole = 'Admin' | 'Manager' | 'Cashier';

export const ALL_PERMISSIONS = [
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
  'users',
] as const;

export type ScreenPermission = (typeof ALL_PERMISSIONS)[number];

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
