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
  cartItemId?: string; // Unique identifier for this cart item (to handle hash collisions)
  productId: number; // Frontend product ID (normalized/hashed)
  originalId?: string; // Backend product ID (MongoDB _id) - used for API calls
  name: string;
  unit: string; // e.g., "Piece", "Box"
  quantity: number;
  unitPrice: number;
  total: number;
  discount: number; // Discount per item unit
  conversionFactor?: number; // Number of this unit in 1 main unit (for conversions)
  costPrice?: number; // Cost price of the product at time of sale
  cost?: number; // Legacy alias for costPrice (optional, for backward compatibility)
}

/** Invoice type: retail uses retail price, wholesale uses wholesale price per product */
export type InvoiceType = 'retail' | 'wholesale';

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
  originalInvoiceId?: string; // For return invoices - links to original sale
  /** Invoice type for pricing: retail (default) or wholesale. Stored in DB for reporting. */
  invoiceType?: InvoiceType;
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
