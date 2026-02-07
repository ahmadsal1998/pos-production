import { apiClient } from '../client';

export const pointsApi = {
  addPoints: (data: {
    invoiceNumber: string;
    customerId: string;
    purchaseAmount: number;
    pointsPercentage?: number;
  }) =>
    apiClient.post<{
      success: boolean;
      message: string;
      data: {
        transaction: {
          id: string;
          points: number;
          purchaseAmount: number;
          pointsPercentage: number;
          pointsValue: number;
        };
        balance: {
          totalPoints: number;
          availablePoints: number;
        };
      };
    }>('/points/add', data),

  getCustomerPoints: (params: {
    customerId?: string;
    globalCustomerId?: string;
    phone?: string;
    email?: string;
  }) =>
    apiClient.get<{
      success: boolean;
      data: {
        balance: {
          id: string;
          globalCustomerId: string;
          customerName: string;
          totalPoints: number;
          availablePoints: number;
          lifetimeEarned: number;
          lifetimeSpent: number;
          lastTransactionDate?: string;
        };
      };
    }>('/points/customer', params),

  getCustomerPointsHistory: (params: {
    customerId?: string;
    globalCustomerId?: string;
    phone?: string;
    email?: string;
    page?: number;
    limit?: number;
  }) =>
    apiClient.get<{
      success: boolean;
      data: {
        transactions: Array<{
          id: string;
          globalCustomerId: string;
          earningStoreId?: string;
          redeemingStoreId?: string;
          transactionType: 'earned' | 'spent' | 'expired' | 'adjusted';
          points: number;
          pointsValue?: number;
          invoiceNumber?: string;
          description?: string;
          createdAt: string;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      };
    }>('/points/customer/history', params),

  payWithPoints: (data: {
    customerId?: string;
    globalCustomerId?: string;
    phone?: string;
    email?: string;
    points: number;
    invoiceNumber?: string;
    description?: string;
  }) =>
    apiClient.post<{
      success: boolean;
      message: string;
      data: {
        transaction: {
          id: string;
          points: number;
          pointsValue: number;
        };
        balance: {
          totalPoints: number;
          availablePoints: number;
        };
      };
    }>('/points/pay', data),
};
