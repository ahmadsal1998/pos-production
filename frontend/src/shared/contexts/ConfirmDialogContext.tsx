import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '@/shared/components/ui/ConfirmDialog/ConfirmDialog';
import { AR_LABELS } from '@/shared/constants/ui';

export type ConfirmDialogOptions = {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmFn = (options: ConfirmDialogOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

export const useConfirmDialog = (): ConfirmFn => {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
  }
  return ctx;
};

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions>({
    title: AR_LABELS.confirmDeleteTitle,
    message: '',
    confirmLabel: AR_LABELS.delete,
    cancelLabel: AR_LABELS.cancel,
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    setIsOpen(false);
    const resolver = resolverRef.current;
    resolverRef.current = null;
    resolver?.(result);
  }, []);

  const confirm = useCallback<ConfirmFn>((nextOptions) => {
    // If a dialog is already open, treat it as cancelled before opening a new one.
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }

    setOptions({
      title: nextOptions.title ?? AR_LABELS.confirmDeleteTitle,
      message: nextOptions.message,
      confirmLabel: nextOptions.confirmLabel ?? AR_LABELS.delete,
      cancelLabel: nextOptions.cancelLabel ?? AR_LABELS.cancel,
    });
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <ConfirmDialog
        isOpen={isOpen}
        title={options.title}
        message={options.message}
        confirmLabel={options.confirmLabel}
        cancelLabel={options.cancelLabel}
        onCancel={() => close(false)}
        onConfirm={() => close(true)}
      />
    </ConfirmDialogContext.Provider>
  );
};


