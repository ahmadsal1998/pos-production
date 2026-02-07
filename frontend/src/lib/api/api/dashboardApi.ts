import { apiClient } from '../client';

export const dashboardApi = {
  getMetrics: () =>
    apiClient.get('/dashboard/metrics'),

  getSalesData: (period: string) =>
    apiClient.get('/dashboard/sales', { period }),

  getProductPerformance: () =>
    apiClient.get('/dashboard/products/performance'),
};
