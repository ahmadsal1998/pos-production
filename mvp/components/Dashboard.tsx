import React from 'react';
import { AR_LABELS, METRIC_CARDS_DATA, QUICK_ACTIONS_DATA } from '../constants';
import MetricCard from './MetricCard';
import QuickActionCard from './QuickActionCard';
import ProductPerformanceCard from './ProductPerformanceCard';

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{AR_LABELS.dashboardTitle}</h1>
        <p className="text-gray-600 dark:text-gray-400">{AR_LABELS.dashboardDescription}</p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {METRIC_CARDS_DATA.map(metric => (
          // Added id prop
          <MetricCard
            key={metric.id}
            id={metric.id}
            title={metric.title}
            value={metric.value}
            icon={metric.icon}
            bgColor={metric.bgColor}
            valueColor={metric.valueColor}
          />
        ))}
      </div>

      {/* Quick Actions Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{AR_LABELS.quickActions}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS_DATA.map(action => (
            // Added id prop
            <QuickActionCard
              key={action.id}
              id={action.id}
              title={action.title}
              icon={action.icon}
              colorClass={action.colorClass}
              path={action.path}
            />
          ))}
        </div>
      </div>

      {/* Product Performance & Insights */}
      <ProductPerformanceCard />

    </div>
  );
};

export default Dashboard;