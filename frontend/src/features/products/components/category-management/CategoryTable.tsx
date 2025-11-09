import React, { useCallback, useMemo, useState } from 'react';
import { AR_LABELS, DeleteIcon, EditIcon, ViewIcon } from '@/shared/constants';
import { Category } from '@/shared/types';

interface CategoryTableProps {
  categories: Category[];
  rootCategories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  onView: (category: Category) => void;
}

interface CategoryTableRowProps {
  category: Category;
  allCategories: Category[];
  level: number;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  onView: (category: Category) => void;
}

const CategoryTableRow: React.FC<CategoryTableRowProps> = ({
  category,
  allCategories,
  level,
  onEdit,
  onDelete,
  onView
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const children = useMemo(
    () => allCategories.filter((item) => item.parentId === category.id),
    [allCategories, category.id]
  );

  const toggleExpand = useCallback(() => {
    setIsOpen((previous) => !previous);
  }, []);

  const handleEdit = useCallback(() => onEdit(category), [category, onEdit]);
  const handleDelete = useCallback(
    () => onDelete(category.id),
    [category.id, onDelete]
  );
  const handleView = useCallback(() => onView(category), [category, onView]);

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
          <div
            className="flex items-center"
            style={{ paddingRight: `${level * 1.5}rem` }}
          >
            {children.length > 0 && (
              <button
                type="button"
                onClick={toggleExpand}
                className="ml-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isOpen ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
            <span className={children.length === 0 ? 'mr-6' : ''}>
              {category.nameAr}
            </span>
          </div>
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {category.productCount}
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
          {new Date(category.createdAt).toLocaleDateString('ar-EG')}
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-sm">
          <span
            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
              category.status === 'Active'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
            }`}
          >
            {category.status === 'Active'
              ? AR_LABELS.active
              : AR_LABELS.inactive}
          </span>
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium">
          <button
            type="button"
            onClick={handleEdit}
            className="ml-2 p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <EditIcon />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
          >
            <DeleteIcon />
          </button>
          <button
            type="button"
            onClick={handleView}
            className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <ViewIcon />
          </button>
        </td>
      </tr>
      {isOpen &&
        children.map((child) => (
          <CategoryTableRow
            key={child.id}
            category={child}
            allCategories={allCategories}
            level={level + 1}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
          />
        ))}
    </>
  );
};

const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  rootCategories,
  onEdit,
  onDelete,
  onView
}) => (
  <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-right dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {AR_LABELS.categoryName}
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
          {rootCategories.map((category) => (
            <CategoryTableRow
              key={category.id}
              category={category}
              allCategories={categories}
              level={0}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
            />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default CategoryTable;

