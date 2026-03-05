import { apiClient } from '../client';

export interface PurchaseItemPayload {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unit?: string;
  /** Base (main unit) selling price to set on product after purchase (last-entered; no averaging). */
  sellingPrice?: number;
  /** Quantity in product main unit (for stock update and weighted avg). Required for multi-unit products. */
  quantityInMainUnit?: number;
}

export const purchasesApi = {
  getNextPoNumber: () =>
    apiClient.get<{ success: boolean; data: { poNumber: string } }>('/purchases/next-po-number'),

  getPurchases: (params?: { supplierId?: string; status?: string }) =>
    apiClient.get<{ success: boolean; data: { purchases: any[] } }>('/purchases', params),

  getPurchase: (id: string) =>
    apiClient.get<{ success: boolean; data: { purchase: any } }>(`/purchases/${id}`),

  createPurchase: (body: {
    supplierId: string;
    supplierName: string;
    items: PurchaseItemPayload[];
    subtotal: number;
    discount?: number;
    tax?: number;
    totalAmount: number;
    paidAmount?: number;
    remainingAmount?: number;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'Credit' | 'Cheque';
    purchaseDate?: string;
    notes?: string;
    chequeDetails?: any;
    poNumber?: string;
  }) =>
    apiClient.post<{ success: boolean; data: { purchase: any } }>('/purchases', body),

  updatePurchase: (
    id: string,
    body: {
      supplierId: string;
      supplierName: string;
      items: PurchaseItemPayload[];
      subtotal: number;
      discount?: number;
      tax?: number;
      totalAmount: number;
      paidAmount?: number;
      remainingAmount?: number;
      paymentMethod: 'Cash' | 'Bank Transfer' | 'Credit' | 'Cheque';
      purchaseDate?: string;
      notes?: string;
      chequeDetails?: any;
    }
  ) =>
    apiClient.put<{ success: boolean; data: { purchase: any } }>(`/purchases/${id}`, body),
};
