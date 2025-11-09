import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AR_LABELS } from '@/shared/constants';
import { Category } from '@/shared/types';
import {
  CategoryDraft,
  CategoryStatus
} from '@/features/products/hooks/useCategoryManagement';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: CategoryDraft & { id?: string }) => Promise<void> | void;
  categoryToEdit: Category | null;
  allCategories: Category[];
}

const EMPTY_CATEGORY: CategoryDraft = {
  nameAr: '',
  description: '',
  parentId: null,
  status: 'Active'
};

const toDraft = (category?: Category | null): CategoryDraft =>
  category
    ? {
        nameAr: category.nameAr,
        description: category.description ?? '',
        parentId: category.parentId,
        status: category.status
      }
    : EMPTY_CATEGORY;

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categoryToEdit,
  allCategories
}) => {
  const [formData, setFormData] = useState<CategoryDraft>(EMPTY_CATEGORY);

  useEffect(() => {
    setFormData(toDraft(categoryToEdit));
  }, [categoryToEdit, isOpen]);

  const handleInputChange = useCallback(
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value } = event.target;
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'parentId' ? (value || null) : value
      }));
    },
    []
  );

  const handleStatusChange = useCallback((status: CategoryStatus) => {
    setFormData((prev) => ({ ...prev, status }));
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!formData.nameAr.trim()) {
        window.alert('الاسم بالعربية مطلوب');
        return;
      }

      try {
        await onSave({
          ...formData,
          description: formData.description?.trim() || '',
          id: categoryToEdit?.id
        });
      } catch (error) {
        console.error('Failed to save category', error);
      }
    },
    [categoryToEdit?.id, formData, onSave]
  );

  const possibleParents = useMemo(
    () => allCategories.filter((category) => category.id !== categoryToEdit?.id),
    [allCategories, categoryToEdit?.id]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-right text-xl font-bold text-gray-800 dark:text-gray-100">
            {categoryToEdit ? AR_LABELS.edit : AR_LABELS.addNewCategory}
          </h2>

          <div>
            <label
              htmlFor="nameAr"
              className="mb-1 block text-right text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {AR_LABELS.nameArabic} *
            </label>
            <input
              id="nameAr"
              name="nameAr"
              type="text"
              value={formData.nameAr}
              onChange={handleInputChange}
              required
              className="w-full rounded-md border border-gray-300 bg-white py-2 text-right text-gray-900 shadow-sm focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>

          <div>
            <label
              htmlFor="parentId"
              className="mb-1 block text-right text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {AR_LABELS.parentCategory}
            </label>
            <select
              id="parentId"
              name="parentId"
              value={formData.parentId ?? ''}
              onChange={handleInputChange}
              className="w-full appearance-none rounded-md border border-gray-300 bg-white py-2 pr-8 text-right text-gray-900 shadow-sm focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="">{AR_LABELS.noParentCategory}</option>
              {possibleParents.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-right text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {AR_LABELS.description}
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 bg-white text-right text-gray-900 shadow-sm focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>

          <div>
            <span className="mb-2 block text-right text-sm font-medium text-gray-700 dark:text-gray-300">
              {AR_LABELS.status}
            </span>
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => handleStatusChange('Inactive')}
                className={`px-4 py-2 text-sm font-medium ${
                  formData.status === 'Inactive'
                    ? 'rounded-md bg-red-500 text-white'
                    : 'rounded-md bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                }`}
              >
                {AR_LABELS.inactive}
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('Active')}
                className={`px-4 py-2 text-sm font-medium ${
                  formData.status === 'Active'
                    ? 'rounded-md bg-green-500 text-white'
                    : 'rounded-md bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                }`}
              >
                {AR_LABELS.active}
              </button>
            </div>
          </div>

          <div className="flex justify-start space-x-4 space-x-reverse pt-4">
            <button
              type="submit"
              className="inline-flex items-center rounded-md border border-transparent bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
            >
              {AR_LABELS.save}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              {AR_LABELS.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryFormModal;

