import React from 'react';
import { AR_LABELS, DeleteIcon, EditIcon } from '@/shared/constants';
import { Unit } from '@/shared/types';
import { formatDate } from '@/shared/utils';

interface UnitTableProps {
  units: Unit[];
  onEdit: (unit: Unit) => void;
  onDelete: (unitId: string) => void;
}

const UnitTable: React.FC<UnitTableProps> = ({ units, onEdit, onDelete }) => (
  <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-right dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              اسم الوحدة
            </th>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {AR_LABELS.description}
            </th>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {AR_LABELS.createdDate}
            </th>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {AR_LABELS.actions}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
          {units.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                لا توجد وحدات
              </td>
            </tr>
          ) : (
            units.map((unit) => (
              <tr key={unit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {unit.nameAr}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {unit.description || '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(unit.createdAt)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium">
                  <button
                    type="button"
                    onClick={() => onEdit(unit)}
                    className="ml-2 p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(unit.id)}
                    className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <DeleteIcon />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default UnitTable;

