import React from 'react';
import { AR_LABELS } from '@/shared/constants';
import { AddProductIcon, ImportIcon, ExportIcon, PrintIcon, SearchIcon } from '@/shared/assets/icons';
import { QuickActionCard } from '@/shared/components/ui/QuickActionCard';

interface UnitQuickActionsProps {
  onAddUnit: () => void;
  onImportUnits: () => void;
  onExportUnits: () => void;
  onPrintUnits: () => void;
  onSearchUnits: () => void;
}

const UnitQuickActions: React.FC<UnitQuickActionsProps> = ({
  onAddUnit,
  onImportUnits,
  onExportUnits,
  onPrintUnits,
  onSearchUnits
}) => {
  const quickActions = [
    {
      id: 1,
      title: 'إضافة وحدة جديدة',
      icon: <AddProductIcon />,
      colorClass: 'bg-orange-500 hover:bg-orange-600 text-white',
      onClick: onAddUnit
    },
    {
      id: 2,
      title: 'استيراد الوحدات',
      icon: <ImportIcon />,
      colorClass: 'bg-blue-500 hover:bg-blue-600 text-white',
      onClick: onImportUnits
    },
    {
      id: 3,
      title: 'تصدير الوحدات',
      icon: <ExportIcon />,
      colorClass: 'bg-green-500 hover:bg-green-600 text-white',
      onClick: onExportUnits
    },
    {
      id: 4,
      title: 'طباعة الوحدات',
      icon: <PrintIcon />,
      colorClass: 'bg-purple-500 hover:bg-purple-600 text-white',
      onClick: onPrintUnits
    },
    {
      id: 5,
      title: 'البحث المتقدم',
      icon: <SearchIcon />,
      colorClass: 'bg-indigo-500 hover:bg-indigo-600 text-white',
      onClick: onSearchUnits
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">الإجراءات السريعة للوحدات</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-200 ${action.colorClass} hover:shadow-lg hover:scale-105`}
          >
            <div className="mb-2">
              {action.icon}
            </div>
            <span className="text-sm font-medium text-center">{action.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default UnitQuickActions;

