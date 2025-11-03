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
}
