import React from 'react';
import { QuickActionProps } from '../types';

const QuickActionCard: React.FC<QuickActionProps> = ({ title, icon, colorClass, path }) => {
  // Add dark mode variants for gray buttons
  const adaptedColorClass = colorClass.includes('bg-gray-200')
    ? `${colorClass} dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200`
    : colorClass;
    
  return (
    <button
      onClick={() => console.log(`Navigating to ${path}`)} // Placeholder for actual navigation
      className={`flex flex-col items-center justify-center p-6 rounded-xl shadow-sm dark:shadow-gray-900/20 
        text-center transition-all duration-200 border border-gray-100 dark:border-gray-700
        ${adaptedColorClass} 
        hover:shadow-lg hover:scale-105 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500
        focus:ring-offset-white dark:focus:ring-offset-gray-800`}
    >
      <div className="mb-3 transform transition-transform group-hover:scale-110">
        {icon}
      </div>
      <span className="font-semibold text-sm">{title}</span>
    </button>
  );
};

export default QuickActionCard;