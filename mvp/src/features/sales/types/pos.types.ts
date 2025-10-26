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
