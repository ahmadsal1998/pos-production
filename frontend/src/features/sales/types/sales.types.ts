import { POSCartItem } from './pos.types';

export type SalePaymentMethod = 'Cash' | 'Card' | 'Credit';
export type SaleStatus = 'Paid' | 'Partial' | 'Due' | 'Returned';

export interface SaleTransaction {
  id: string;
  invoiceNumber?: string; // The actual invoice number displayed to users
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
