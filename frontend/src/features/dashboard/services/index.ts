// Dashboard-specific services
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

export interface DashboardMetrics {
  todaysSales: string;
  thisMonth: string;
  todaysTransactions: string;
  totalProducts: string;
  lowStockProducts: string;
  expiredProducts: string;
  customersWithBalance: string;
}

export interface ProductPerformance {
  bestSelling: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  leastSelling: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
}

export class DashboardService {
  static async getMetrics(): Promise<DashboardMetrics> {
    try {
      // In real implementation, this would call the API
      // const response = await apiClient.get(API_ENDPOINTS.DASHBOARD.METRICS);
      // return response.data;
      
      // Mock data for now
      return {
        todaysSales: '$0.00',
        thisMonth: '$0.00',
        todaysTransactions: '0',
        totalProducts: '1',
        lowStockProducts: '0',
        expiredProducts: '0',
        customersWithBalance: '0',
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  }

  static async getProductPerformance(): Promise<ProductPerformance> {
    try {
      // In real implementation, this would call the API
      // const response = await apiClient.get(API_ENDPOINTS.DASHBOARD.PRODUCT_PERFORMANCE);
      // return response.data;
      
      // Mock data for now
      return {
        bestSelling: [],
        leastSelling: [],
      };
    } catch (error) {
      console.error('Error fetching product performance:', error);
      throw error;
    }
  }
}
