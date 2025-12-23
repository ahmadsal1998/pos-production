import { Request } from 'express';

export interface IUser {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: SystemRole;
  permissions: ScreenPermission[];
  status: 'Active' | 'Inactive';
  lastLogin?: Date;
  storeId?: string | null; // null for system/admin users, string for store-specific users
  createdAt: Date;
  updatedAt: Date;
}

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
  | 'users'
  | 'storePointsAccount'
  | 'pointsHistory';

export interface LoginRequest extends Request {
  body: {
    emailOrUsername: string;
    password: string;
  };
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: SystemRole;
  storeId?: string | null; // null for system/admin users, string for store-specific users
}

export interface AuthResponse {
  user: {
    id: string;
    fullName: string;
    username: string;
    email: string;
    role: SystemRole;
    permissions: ScreenPermission[];
  };
  token: string;
  refreshToken?: string;
}

