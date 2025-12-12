import React from 'react';
import { AR_LABELS, DeleteIcon, EditIcon } from '@/shared/constants';
import { Unit } from '@/shared/types';
import { formatDate } from '@/shared/utils';

interface UnitGridProps {
  units: Unit[];
  onEdit: (unit: Unit) => void;
  onDelete: (unitId: string) => void;
}

const UnitGrid: React.FC<UnitGridProps> = ({ units, onEdit, onDelete }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {units.length === 0 ? (
      <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
        لا توجد وحدات
      </div>
    ) : (
      units.map((unit) => (
        <div
          key={unit.id}
          className="flex flex-col justify-between space-y-2 rounded-lg bg-white p-4 shadow dark:bg-gray-800"
        >
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {unit.nameAr}
            </h3>
            {unit.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {unit.description}
              </p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              {formatDate(unit.createdAt)}
            </p>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse border-t pt-2 dark:border-gray-700">
            <button
              type="button"
              onClick={() => onEdit(unit)}
              className="p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
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
          </div>
        </div>
      ))
    )}
  </div>
);

export default UnitGrid;

