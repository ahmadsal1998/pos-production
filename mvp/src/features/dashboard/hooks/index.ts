// Dashboard-specific custom hooks
import { useState, useEffect } from 'react';

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState({
    todaysSales: '$0.00',
    thisMonth: '$0.00',
    todaysTransactions: '0',
    totalProducts: '1',
    lowStockProducts: '0',
    expiredProducts: '0',
    customersWithBalance: '0',
  });

  const [isLoading, setIsLoading] = useState(false);

  const refreshMetrics = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real implementation, this would fetch from API
      setMetrics(prev => ({ ...prev }));
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshMetrics();
  }, []);

  return { metrics, isLoading, refreshMetrics };
};

export const useQuickActions = () => {
  const [actions, setActions] = useState([
    {
      id: 1,
      title: 'New Sale',
      path: '/pos/new-sale',
      colorClass: 'bg-blue-500 hover:bg-blue-600 text-white',
    },
    {
      id: 2,
      title: 'Add Product',
      path: '/products/add-multi-unit',
      colorClass: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    },
    {
      id: 3,
      title: 'View Customers',
      path: '/customers',
      colorClass: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    },
    {
      id: 4,
      title: 'View Reports',
      path: '/reports',
      colorClass: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    },
  ]);

  const executeAction = (actionId: number) => {
    const action = actions.find(a => a.id === actionId);
    if (action) {
      console.log(`Executing action: ${action.title} -> ${action.path}`);
      // In real implementation, this would navigate to the path
    }
  };

  return { actions, executeAction };
};
