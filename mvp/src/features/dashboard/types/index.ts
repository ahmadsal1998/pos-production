// Dashboard-specific types
export interface DashboardState {
  metrics: {
    todaysSales: string;
    thisMonth: string;
    todaysTransactions: string;
    totalProducts: string;
    lowStockProducts: string;
    expiredProducts: string;
    customersWithBalance: string;
  };
  isLoading: boolean;
  error: string | null;
}

export interface QuickAction {
  id: number;
  title: string;
  path: string;
  colorClass: string;
}

export interface ProductPerformanceData {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  profitMargin: number;
}
