// Financial feature types
export interface Cheque {
  id: string;
  chequeNumber: string;
  chequeAmount: number;
  bankName: string;
  chequeDueDate: string;
  status: 'Pending' | 'Cleared' | 'Bounced';
  supplierId: string;
  supplierName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChequeDetails {
  chequeNumber?: string;
  chequeAmount: number;
  bankName?: string;
  chequeDueDate: string;
  status: 'Pending' | 'Cleared' | 'Bounced';
  notes?: string;
}

export type ChequeStatus = 'Pending' | 'Cleared' | 'Bounced';

export interface Expense {
  id: string;
  expenseNumber: string;
  category: string;
  amount: number;
  description: string;
  responsiblePerson: string;
  responsible: string; // Alias
  status: 'Paid' | 'Unpaid';
  date: string;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory = string;
export type ExpenseStatus = 'Paid' | 'Unpaid';
export type ExpensePaymentMethod = string;

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'cash' | 'card' | 'digital_wallet' | 'other';
  isActive: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unit: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  status: 'Pending' | 'Completed' | 'Cancelled';
  purchaseDate: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Credit' | 'Cheque';
  chequeDetails?: ChequeDetails;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  previousBalance?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PurchaseStatus = 'Pending' | 'Completed' | 'Cancelled';
export type PurchasePaymentMethod = 'Cash' | 'Bank Transfer' | 'Credit' | 'Cheque';

export interface SupplierPayment {
  id: string;
  supplierId: string;
  purchaseId?: string;
  amount: number;
  method: 'Cash' | 'Bank Transfer' | 'Cheque';
  date: string;
  notes?: string;
  createdAt: string;
}
