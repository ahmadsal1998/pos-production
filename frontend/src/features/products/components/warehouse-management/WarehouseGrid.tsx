import React from 'react';
import { AR_LABELS, DeleteIcon, EditIcon } from '@/shared/constants';
import { Warehouse } from '@/shared/types';

interface WarehouseGridProps {
  warehouses: Warehouse[];
  onEdit: (warehouse: Warehouse) => void;
  onDelete: (warehouseId: string) => void;
}

const WarehouseGrid: React.FC<WarehouseGridProps> = ({
  warehouses,
  onEdit,
  onDelete
}) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {warehouses.map((warehouse) => (
      <div
        key={warehouse.id}
        className="flex flex-col justify-between space-y-2 rounded-lg bg-white p-4 shadow dark:bg-gray-800"
      >
        <div>
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {warehouse.nameAr}
            </h3>
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
          </div>
          {warehouse.address && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {warehouse.address}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {AR_LABELS.productCount}: {warehouse.productCount}
          </p>
        </div>
        <div className="flex justify-end space-x-2 space-x-reverse border-t pt-2 dark:border-gray-700">
          <button
            type="button"
            onClick={() => onEdit(warehouse)}
            className="p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <EditIcon />
          </button>
          <button
            type="button"
            onClick={() => onDelete(warehouse.id)}
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
          >
            <DeleteIcon />
          </button>
        </div>
      </div>
    ))}
  </div>
);

export default WarehouseGrid;

