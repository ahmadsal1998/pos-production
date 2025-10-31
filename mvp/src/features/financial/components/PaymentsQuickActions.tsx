import React from 'react';
import { AR_LABELS } from '@/shared/constants';
import { PlusIcon, PrintIcon, ExportIcon, ViewIcon } from '@/shared/constants';

interface PaymentsQuickActionsProps {
  onAddPayment: () => void;
  onViewPayments: () => void;
  onPrintPayments: () => void;
  onExportPayments: () => void;
}

const PaymentsQuickActions: React.FC<PaymentsQuickActionsProps> = ({
  onAddPayment,
  onViewPayments,
  onPrintPayments,
  onExportPayments
}) => {
  const quickActions = [
    {
      id: 1,
      title: 'إضافة دفعة',
      icon: <PlusIcon className="h-6 w-6" />,
      colorClass: 'bg-orange-500 hover:bg-orange-600 text-white',
      onClick: onAddPayment
    },
    {
      id: 2,
      title: 'عرض المدفوعات',
      icon: <ViewIcon />,
      colorClass: 'bg-blue-500 hover:bg-blue-600 text-white',
      onClick: onViewPayments
    },
    {
      id: 3,
      title: 'طباعة المدفوعات',
      icon: <PrintIcon />,
      colorClass: 'bg-purple-500 hover:bg-purple-600 text-white',
      onClick: onPrintPayments
    },
    {
      id: 4,
      title: 'تصدير المدفوعات',
      icon: <ExportIcon />,
      colorClass: 'bg-green-500 hover:bg-green-600 text-white',
      onClick: onExportPayments
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">إجراءات المدفوعات</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

export default PaymentsQuickActions;

