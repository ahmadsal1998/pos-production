import { apiClient } from '../client';

export const adminApi = {
  getStores: () =>
    apiClient.get<{ success: boolean; data: { stores: any[] } }>('/admin/stores'),

  getStore: (id: string) =>
    apiClient.get<{ success: boolean; data: { store: any } }>(`/admin/stores/${id}`),

  createStore: (store: {
    name: string;
    storeId: string;
    storeTypeId: string;
    subscriptionDuration?: '1month' | '2months' | '1year' | '2years';
    subscriptionEndDate?: string;
  }) =>
    apiClient.post<{ success: boolean; message: string; data: { store: any; defaultAdmin?: { id: string; username: string; email: string; fullName: string } | null } }>('/admin/stores', store),

  updateStore: (id: string, store: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    storeTypeId?: string;
  }) =>
    apiClient.put<{ success: boolean; message: string; data: { store: any } }>(`/admin/stores/${id}`, store),

  deleteStore: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/admin/stores/${id}`),

  renewSubscription: (id: string, data: {
    subscriptionDuration?: '1month' | '2months' | '1year' | '2years';
    subscriptionEndDate?: string;
  }) =>
    apiClient.post<{ success: boolean; message: string; data: { store: any } }>(`/admin/stores/${id}/renew-subscription`, data),

  toggleStoreStatus: (id: string, isActive: boolean) =>
    apiClient.patch<{ success: boolean; message: string; data: { store: any } }>(`/admin/stores/${id}/status`, { isActive }),

  getSettings: () =>
    apiClient.get<{ success: boolean; data: { settings: Record<string, string>; settingsList: any[] } }>('/admin/settings'),

  getSetting: (key: string) =>
    apiClient.get<{ success: boolean; data: { setting: any } }>(`/admin/settings/${key}`),

  updateSetting: (key: string, data: { value: string; description?: string }) =>
    apiClient.put<{ success: boolean; message: string; data: { setting: any } }>(`/admin/settings/${key}`, data),

  getStoreTypes: () =>
    apiClient.get<{ success: boolean; data: { storeTypes: Array<{ id: string; name: string; description?: string; createdAt?: string; updatedAt?: string }> } }>('/admin/store-types'),
  createStoreType: (data: { name: string; description?: string }) =>
    apiClient.post<{ success: boolean; message: string; data: { storeType: { id: string; name: string; description?: string } } }>('/admin/store-types', data),
  updateStoreType: (id: string, data: { name?: string; description?: string }) =>
    apiClient.put<{ success: boolean; message: string; data: { storeType: any } }>(`/admin/store-types/${id}`, data),
  deleteStoreType: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/admin/store-types/${id}`),

  getTrialAccountsPurgeReport: () =>
    apiClient.get<{
      success: boolean;
      data: {
        report: {
          storesFound: number;
          storesToDelete: Array<{
            id: string;
            storeId: string;
            name: string;
            createdAt: string;
            userCount: number;
          }>;
          collectionsToPurge: string[];
          totalDocumentsToDelete: { [key: string]: number };
          estimatedSize: string;
        };
        message: string;
      };
    }>('/admin/trial-accounts/purge-report'),

  purgeAllTrialAccounts: () =>
    apiClient.post<{
      success: boolean;
      data: {
        report: any;
        deleted: {
          stores: number;
          users: number;
          collections: { [key: string]: number };
        };
        errors: string[];
      };
      message: string;
    }>('/admin/trial-accounts/purge', { confirm: true }),

  purgeSpecificTrialAccount: (storeId: string, confirm: boolean = false) =>
    apiClient.post<{
      success: boolean;
      data: {
        store: any;
        deleted: {
          users: number;
          documents: { [key: string]: number };
        };
        errors?: string[];
        message?: string;
      };
    }>(`/admin/trial-accounts/${storeId}/purge`, { confirm }),

  getPointsSettings: (storeId?: string) =>
    apiClient.get<{
      success: boolean;
      data: {
        settings: {
          id: string;
          storeId?: string;
          userPointsPercentage: number;
          companyProfitPercentage: number;
          defaultThreshold: number;
          pointsExpirationDays?: number;
          minPurchaseAmount?: number;
          maxPointsPerTransaction?: number;
          pointsValuePerPoint?: number;
        };
      };
    }>('/admin/points-settings', storeId ? { storeId } : undefined),

  updatePointsSettings: (data: {
    storeId?: string;
    userPointsPercentage?: number;
    companyProfitPercentage?: number;
    defaultThreshold?: number;
    pointsExpirationDays?: number;
    minPurchaseAmount?: number;
    maxPointsPerTransaction?: number;
    pointsValuePerPoint?: number;
  }) =>
    apiClient.put<{
      success: boolean;
      message: string;
      data: {
        settings: any;
      };
    }>('/admin/points-settings', data),

  getStorePointsAccounts: () =>
    apiClient.get<{
      success: boolean;
      data: {
        accounts: Array<{
          id: string;
          storeId: string;
          storeName: string;
          totalPointsIssued: number;
          totalPointsRedeemed: number;
          netPointsBalance: number;
          pointsValuePerPoint: number;
          totalPointsValueIssued: number;
          totalPointsValueRedeemed: number;
          netFinancialBalance: number;
          amountOwed: number;
          lastUpdated: string;
        }>;
      };
    }>('/store-points-accounts'),

  getStorePointsAccount: (storeId: string) =>
    apiClient.get<{
      success: boolean;
      data: {
        account: {
          id: string;
          storeId: string;
          storeName: string;
          totalPointsIssued: number;
          totalPointsRedeemed: number;
          netPointsBalance: number;
          pointsValuePerPoint: number;
          totalPointsValueIssued: number;
          totalPointsValueRedeemed: number;
          netFinancialBalance: number;
          amountOwed: number;
          lastUpdated: string;
        };
      };
    }>(`/store-points-accounts/${storeId}`),

  getStorePointsTransactions: (storeId: string, params?: {
    page?: number;
    limit?: number;
    transactionType?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    apiClient.get<{
      success: boolean;
      data: {
        transactions: any[];
        summary: {
          totalIssued: number;
          totalRedeemed: number;
          netPointsBalance: number;
          totalIssuedValue: number;
          totalRedeemedValue: number;
          netFinancialBalance: number;
          amountOwed: number;
        };
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      };
    }>(`/store-points-accounts/${storeId}/transactions`, params),
};
