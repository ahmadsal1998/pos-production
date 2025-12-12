import React, { useCallback, useEffect, useState } from 'react';
import { AR_LABELS } from '@/shared/constants';
import { Unit } from '@/shared/types';

type UnitDraft = {
  id?: string;
  nameAr: string;
  description?: string;
};

interface UnitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (unit: UnitDraft) => Promise<void> | void;
  unitToEdit: Unit | null;
  emptyUnit: UnitDraft;
}

const UnitFormModal: React.FC<UnitFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  unitToEdit,
  emptyUnit
}) => {
  const [formData, setFormData] = useState(emptyUnit);

  useEffect(() => {
    if (unitToEdit) {
      setFormData({
        nameAr: unitToEdit.nameAr,
        description: unitToEdit.description ?? ''
      });
    } else {
      setFormData(emptyUnit);
    }
  }, [unitToEdit, emptyUnit, isOpen]);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = event.target;
      setFormData((previous) => ({ ...previous, [name]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!formData.nameAr.trim()) {
        window.alert(`${AR_LABELS.nameArabic} مطلوب`);
        return;
      }

      try {
        const payload: UnitDraft = {
          ...formData,
          nameAr: formData.nameAr.trim(),
          description: formData.description?.trim() ?? ''
        };

        if (unitToEdit?.id) {
          payload.id = unitToEdit.id;
        }

        await onSave(payload);
      } catch (error) {
        console.error('Failed to save unit', error);
      }
    },
    [unitToEdit?.id, formData, onSave]
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
            {unitToEdit ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}
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

export default UnitFormModal;

