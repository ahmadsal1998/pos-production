import * as React from 'react';

export interface NavItem {
  id: number;
  label: string;
  icon: React.ReactNode;
  path: string;
  isDropdown?: boolean;
  dropdownItems?: NavItem[];
}

export interface TopNavItem {
  id: number;
  label: string;
  path: string;
}

export interface MetricCardProps {
  id: number;
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor: string;
  valueColor: string;
}

export interface QuickActionProps {
  id: number;
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  path: string;
}

export interface ProfileStats {
  applied: number;
  won: number;
  current: number;
}

export interface ProfileFormFields {
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  city: string;
  country: string;
}

export type Theme = 'light' | 'dark';

// Product interface
export interface Product {
  id: number;
  name: string;
  category: string;
  brand: string;
  price: number;
  cost: number;
  costPrice: number; // Alias for cost
  stock: number;
  barcode: string;
  description?: string;
  image?: string;
  units?: Array<{
    unitName: string;
    barcode?: string;
    sellingPrice: number;
    conversionFactor: number;
  }>;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
  showInQuickProducts?: boolean;
}
