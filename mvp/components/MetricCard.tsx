import React from 'react';
import { MetricCardProps } from '../types';

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, bgColor, valueColor }) => {
  // Simple mapping for dark mode icon backgrounds. Could be more sophisticated.
  const darkBgColor = bgColor.replace('-100', '-900/30');
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 p-6 flex items-center gap-4 hover:shadow-md transition-shadow duration-200 border border-gray-100 dark:border-gray-700">
      <div className={`p-3 rounded-xl ${bgColor} ${darkBgColor} flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{title}</p>
        <p className={`text-2xl font-bold ${valueColor} truncate`}>{value}</p>
      </div>
    </div>
  );
};

export default MetricCard;