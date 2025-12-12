import React, { useCallback } from 'react';
import { AR_LABELS, DeleteIcon, EditIcon, ViewIcon } from '@/shared/constants';
import { Warehouse } from '@/shared/types';
import { formatDate } from '@/shared/utils';

interface WarehouseTableProps {
  warehouses: Warehouse[];
  onEdit: (warehouse: Warehouse) => void;
  onDelete: (warehouseId: string) => void;
  onView: (warehouse: Warehouse) => void;
}

const WarehouseTable: React.FC<WarehouseTableProps> = ({
  warehouses,
  onEdit,
  onDelete,
  onView
}) => {
  const handleEdit = useCallback((warehouse: Warehouse) => onEdit(warehouse), [onEdit]);
  const handleDelete = useCallback(
    (warehouseId: string) => onDelete(warehouseId),
    [onDelete]
  );
  const handleView = useCallback((warehouse: Warehouse) => onView(warehouse), [onView]);

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-right dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                اسم المستودع
              </th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                العنوان
              </th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                عدد المنتجات
              </th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                تاريخ الإنشاء
              </th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                الحالة
              </th>
              <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {warehouses.map((warehouse) => (
              <tr key={warehouse.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {warehouse.nameAr}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {warehouse.address || '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {warehouse.productCount}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(warehouse.createdAt)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      warehouse.status === 'Active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                    }`}
                  >
                    {warehouse.status === 'Active'
                      ? AR_LABELS.active
                      : AR_LABELS.inactive}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium">
                  <button
                    type="button"
                    onClick={() => handleEdit(warehouse)}
                    className="ml-2 p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(warehouse.id)}
                    className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <DeleteIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleView(warehouse)}
                    className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <ViewIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WarehouseTable;

