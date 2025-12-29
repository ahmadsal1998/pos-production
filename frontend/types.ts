import React from 'react';

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

export interface Product {
  id: number;
  name: string;
  category: string;
  brand?: string; // Optional brand
  price: number;
  costPrice: number; // Added for profit calculation
  stock: number;
  barcode: string;
  expiryDate: string;
  createdAt: string;
}

// --- NEW DYNAMIC MULTI-UNIT PRODUCT INTERFACES ---

/** Represents the input fields for a single custom unit level in the form. */
export interface CustomUnitInput {
  id: string; // Unique ID for React keying and referencing
  unitName: string;
  barcode: string;
  subUnitsPerThisUnit: number; // How many of the NEXT unit level are in THIS unit (0 for the lowest unit)
  sellingPrice: number;
}

/** Represents the calculated details for a single custom unit level. */
export interface CalculatedUnitDetails {
  id: string; // Matches CustomUnitInput.id
  unitName: string;
  barcode: string;
  totalQuantity: number; // Total count of this unit type in the entire product stock
  costPerUnit: number;
  sellingPricePerUnit: number;
  subUnitsPerThisUnit?: number; // How many of the NEXT unit level are in THIS unit (undefined/0 for the lowest unit)
}

/** Represents the final structure of a saved multi-unit product. */
export interface MultiUnitProduct {
  name: string;
  category: string;
  purchaseTotal: number;
  unitLevels: CalculatedUnitDetails[]; // Array of unit details, ordered from highest to lowest
  stock: Record<string, number>; // Dynamic stock, e.g., { "Box": 3, "Carton": 36, "Piece": 864 }
  createdAt: string;
}

/** Form field structure for AddMultiUnitProductPage (input values before calculation) */
export interface MultiUnitProductFormInput {
  productName: string;
  category: string;
  initialQuantityHighestUnit: number; // E.g., 'Number of Boxes'
  totalPurchasePrice: number;
  unitLevels: CustomUnitInput[]; // Dynamic array of units, ordered from highest to lowest
}

/** Calculated fields for AddMultiUnitProductPage (dynamic structure) */
export interface MultiUnitProductCalculatedFields {
  [unitId: string]: {
    totalQuantity: number;
    costPerUnit: number;
  };
}

export type SalePaymentMethod = 'Cash' | 'Card' | 'Credit';
export type SaleStatus = 'Paid' | 'Partial' | 'Due' | 'Returned';

export interface SaleTransaction {
  id: string;
  date: string; // ISO format string
  customerName: string;
  customerId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: SalePaymentMethod;
  status: SaleStatus;
  seller: string;
  // Add item details to show in the modal
  items: POSCartItem[];
  subtotal: number;
  totalItemDiscount: number; // Sum of all item discounts
  invoiceDiscount: number; // A single discount on the whole invoice
  tax: number; // Tax amount
  originalInvoiceId?: string; // For returns
}

// --- CATEGORY MANAGEMENT INTERFACES ---

// This interface will represent both main categories and subcategories.
export interface Category {
  id: string;
  nameAr: string;
  description?: string; // Optional description
  parentId: string | null; // null for top-level categories
  status: 'Active' | 'Inactive';
  createdAt: string; // ISO date string
  productCount: number; // Number of products in this category
}

// --- BRAND MANAGEMENT INTERFACES ---
export interface Brand {
  id: string;
  nameAr: string;
  description?: string;
  status: 'Active' | 'Inactive';
  createdAt: string; // ISO date string
  productCount: number;
}

// --- POINT OF SALE (POS) INTERFACES ---
export interface Customer {
  id: string;
  name: string;
  phone: string;
  previousBalance: number;
  companyName?: string; // For wholesale
  address?: string; // For wholesale
}

export interface POSCartItem {
  productId: number;
  name: string;
  unit: string; // e.g., "Piece", "Box"
  quantity: number;
  unitPrice: number;
  total: number;
  discount: number; // Discount per item unit
  conversionFactor?: number; // Number of this unit in 1 main unit (for conversions)
}

export interface POSInvoice {
  id: string;
  date: Date;
  cashier: string;
  customer: Customer | null;
  items: POSCartItem[];
  subtotal: number;
  totalItemDiscount: number; // Sum of all item discounts
  invoiceDiscount: number; // A single discount on the whole invoice
  tax: number; // Tax amount
  grandTotal: number;
  paymentMethod: string | null;
}

// --- WHOLESALE POS INTERFACES ---

export interface WholesaleProductUnit {
  name: string; // Box, Carton, Piece
  price: number;
  cost: number; // Added for profit calculation
  stock: number;
  barcode: string;
}

export interface WholesaleProduct {
  id: number;
  name: string;
  category: string;
  brand: string;
  units: WholesaleProductUnit[];
  imageUrl?: string;
  createdAt: string;
}

export interface WholesalePOSCartItem {
  productId: number;
  name: string;
  unitName: string; // e.g., "Carton"
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface WholesaleInvoice {
  id: string;
  date: Date;
  cashier: string;
  customer: Customer | null;
  items: WholesalePOSCartItem[];
  subtotal: number;
  totalDiscount: number; // A single discount on the whole invoice
  grandTotal: number;
  paymentMethod: string | null;
  dueDate?: string; // For credit sales
}

// --- REFUNDS INTERFACES ---
export interface RefundedItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  refundedAmount: number;
}

export interface RefundTransaction {
  id: string;
  originalInvoiceId: string;
  customerName: string;
  refundedItems: RefundedItem[];
  totalRefundAmount: number;
  refundDate: string; // ISO Date String
  refundMethod: 'Cash' | 'Card' | 'Customer Credit';
  reason?: string;
  status: 'Full' | 'Partial';
  processedBy: string;
}

// FIX: Add PaymentMethod interface to resolve import error in PaymentMethodsPage.tsx
export interface PaymentMethod {
  id: string;
  name: string;
  type: 'Cash' | 'Card' | 'Digital Wallet' | 'Credit' | 'Other';
  status: 'Active' | 'Inactive';
}

// --- PREFERENCES INTERFACES ---
export interface SystemPreferences {
  // General
  businessName: string;
  logoUrl: string;
  defaultCurrency: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  timeFormat: '12-hour' | '24-hour';
  defaultLanguage: 'ar' | 'en';
  // Invoice & Sales
  vatPercentage: number;
  invoiceNumberFormat: string;
  invoiceFooterText: string;
  autoPrintInvoice: boolean;
  sellWithoutStock: boolean;
  allowSellingZeroStock: boolean;
  // User Roles
  sessionDuration: number;
  allowUserCreation: boolean;
  // Inventory
  defaultUnits: string; // Comma-separated
  minStockLevel: number;
  enableLowStockNotifications: boolean;
  // Payments
  allowCash: boolean;
  allowCard: boolean;
  allowCredit: boolean;
  // Notifications
  enableOverdueNotifications: boolean;
  enableAutoNotifications: boolean;
  // Other
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

// --- SUPPLIER MANAGEMENT INTERFACES ---
export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  previousBalance: number;
}

// --- PURCHASES INTERFACES ---
export interface PurchaseItem {
  productId: number;
  productName: string;
  unit: string;
  quantity: number;
  cost: number; // Cost per unit
  total: number;
  quantityReceived?: number; // For tracking received stock
}

export type PurchaseStatus = 'Pending' | 'Completed' | 'Cancelled';
export type PurchasePaymentMethod = 'Cash' | 'Bank Transfer' | 'Credit' | 'Cheque';
export type ChequeStatus = 'Pending' | 'Cleared' | 'Bounced';

export interface ChequeDetails {
  chequeNumber?: string;
  chequeAmount: number;
  chequeDueDate: string; // ISO Date String
  bankName?: string;
  notes?: string;
  status: ChequeStatus;
}

export interface PurchaseOrder {
  id: string; // PO Number
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number; // Stored as a percentage
  discount: number;
  totalAmount: number;
  status: PurchaseStatus;
  purchaseDate: string; // ISO Date String
  paymentMethod: PurchasePaymentMethod;
  chequeDetails?: ChequeDetails;
  notes?: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  purchaseId?: string;
  amount: number;
  method: 'Cash' | 'Bank Transfer' | 'Cheque';
  date: string; // ISO Date String
  notes?: string;
  chequeDetails?: ChequeDetails;
}

// --- EXPENSES INTERFACES ---
export type ExpenseCategory =
  | 'Salaries'
  | 'Maintenance'
  | 'Operations'
  | 'Marketing'
  | 'Rent'
  | 'Utilities'
  | 'Other';
export type ExpenseStatus = 'Paid' | 'Unpaid';
export type ExpensePaymentMethod = 'Cash' | 'Bank Transfer' | 'Card';

export interface Expense {
  id: string; // Expense Number
  category: ExpenseCategory;
  responsible: string; // Employee or Department
  amount: number;
  date: string; // ISO Date String
  status: ExpenseStatus;
  paymentMethod: ExpensePaymentMethod;
  notes?: string;
}

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

// --- NEW SALES MANAGEMENT INTERFACES ---
export interface CustomerPayment {
  id: string;
  customerId: string;
  date: string; // ISO format
  amount: number;
  method: 'Cash' | 'Bank Transfer' | 'Cheque';
  invoiceId?: string; // Optional link to a specific invoice
  notes?: string;
}

export interface CustomerAccountSummary {
  customerId: string;
  customerName: string;
  address?: string;
  totalSales: number;
  totalPaid: number;
  balance: number;
  lastPaymentDate: string | null;
}

// FIX: Moved Theme type here to resolve circular dependency.
export type Theme = 'light' | 'dark';
