import React, { useEffect } from 'react';
import { AR_LABELS } from '@/shared/constants/ui';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = AR_LABELS.confirmDeleteTitle,
  message,
  confirmLabel = AR_LABELS.delete,
  cancelLabel = AR_LABELS.cancel,
  onConfirm,
  onCancel,
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Close modal on Escape key (treated as cancel)
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4"
      onClick={onCancel}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        dir="rtl"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center border border-red-200 dark:border-red-900/40">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {message}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-start gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;


