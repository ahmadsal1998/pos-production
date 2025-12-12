// Sales feature types
export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'credit';
  status: 'completed' | 'refunded' | 'partial_refund';
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Refund {
  id: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  items: RefundItem[];
  refundAmount: number;
  reason?: string;
  createdAt: string;
}

export interface RefundItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface RefundedItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface RefundTransaction {
  id: string;
  originalInvoiceId: string;
  refundAmount: number;
  reason?: string;
  createdAt: string;
}

export interface POSItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface POSInvoice {
  id: string;
  invoiceNumber: string;
  items: POSCartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'credit';
  createdAt: string;
}

export interface POSCartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  conversionFactor?: number;
}

export interface SaleTransaction {
  id: string;
  invoiceNumber: string;
  customerName?: string;
  total: number;
  paymentMethod: 'cash' | 'card' | 'credit';
  createdAt: string;
}

export interface WholesaleProduct {
  id: string;
  name: string;
  category: string;
  brand: string;
  units: WholesaleProductUnit[];
  stock: number;
  createdAt: string;
}

export interface WholesaleProductUnit {
  id: string;
  name: string;
  price: number;
  stock: number;
  conversionFactor: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
  createdAt: string;
}

export interface WholesaleInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  items: WholesalePOSCartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'credit';
  createdAt: string;
}

export interface WholesalePOSCartItem {
  productId: string;
  productName: string;
  unitId: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}
