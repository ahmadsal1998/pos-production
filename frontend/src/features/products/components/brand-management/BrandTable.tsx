import React from 'react';
import { AR_LABELS, DeleteIcon, EditIcon, ViewIcon } from '@/shared/constants';
import { Brand } from '@/shared/types';

interface BrandTableProps {
  brands: Brand[];
  onEdit: (brand: Brand) => void;
  onDelete: (brandId: string) => void;
}

const BrandTable: React.FC<BrandTableProps> = ({ brands, onEdit, onDelete }) => (
  <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-right dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {AR_LABELS.brandName}
            </th>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {AR_LABELS.productCount}
            </th>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {AR_LABELS.createdDate}
            </th>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {AR_LABELS.status}
            </th>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {AR_LABELS.actions}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
          {brands.map((brand) => (
            <tr key={brand.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                {brand.nameAr}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {brand.productCount}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                {new Date(brand.createdAt).toLocaleDateString('ar-EG')}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm">
                <span
                  className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    brand.status === 'Active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                  }`}
                >
                  {brand.status === 'Active' ? AR_LABELS.active : AR_LABELS.inactive}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium">
                <button
                  type="button"
                  onClick={() => onEdit(brand)}
                  className="ml-2 p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(brand.id)}
                  className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  <DeleteIcon />
                </button>
                <button
                  type="button"
                  onClick={() => window.alert(`View details for ${brand.nameAr}`)}
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

export default BrandTable;

