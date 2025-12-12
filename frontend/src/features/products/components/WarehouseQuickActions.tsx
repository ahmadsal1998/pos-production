import React from 'react';
import { AR_LABELS } from '@/shared/constants';
import { AddProductIcon, ImportIcon, ExportIcon, PrintIcon, SearchIcon } from '@/shared/assets/icons';
import { QuickActionCard } from '@/shared/components/ui/QuickActionCard';

interface WarehouseQuickActionsProps {
  onAddWarehouse: () => void;
  onImportWarehouses: () => void;
  onExportWarehouses: () => void;
  onPrintWarehouses: () => void;
  onSearchWarehouses: () => void;
}

const WarehouseQuickActions: React.FC<WarehouseQuickActionsProps> = ({
  onAddWarehouse,
  onImportWarehouses,
  onExportWarehouses,
  onPrintWarehouses,
  onSearchWarehouses
}) => {
  const quickActions = [
    {
      id: 1,
      title: 'إضافة مستودع جديد',
      icon: <AddProductIcon />,
      colorClass: 'bg-orange-500 hover:bg-orange-600 text-white',
      onClick: onAddWarehouse
    },
    {
      id: 2,
      title: 'استيراد المستودعات',
      icon: <ImportIcon />,
      colorClass: 'bg-blue-500 hover:bg-blue-600 text-white',
      onClick: onImportWarehouses
    },
    {
      id: 3,
      title: 'تصدير المستودعات',
      icon: <ExportIcon />,
      colorClass: 'bg-green-500 hover:bg-green-600 text-white',
      onClick: onExportWarehouses
    },
    {
      id: 4,
      title: 'طباعة المستودعات',
      icon: <PrintIcon />,
      colorClass: 'bg-purple-500 hover:bg-purple-600 text-white',
      onClick: onPrintWarehouses
    },
    {
      id: 5,
      title: 'البحث المتقدم',
      icon: <SearchIcon />,
      colorClass: 'bg-indigo-500 hover:bg-indigo-600 text-white',
      onClick: onSearchWarehouses
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">الإجراءات السريعة للمستودعات</h3>
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

export default WarehouseQuickActions;

