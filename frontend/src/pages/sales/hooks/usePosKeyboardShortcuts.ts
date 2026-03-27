import { useEffect, useRef } from 'react';

/**
 * POS-only shortcuts (keydown, non-repeating):
 * - F1: Confirm payment (main button, or modal confirm when payment dialog is open)
 * - F2: Start new sale
 *
 * Works while focused in inputs/textareas. Uses the same code paths as the visible buttons
 * (click / modal handler) to avoid duplicate logic and race conditions.
 */
export interface PosKeyboardShortcutContext {
  paymentConfirmationModalOpen: boolean;
  handlePaymentConfirmationConfirm: () => void | Promise<void>;
  hasUnsyncedSales: boolean;
  isProcessingPayment: boolean;
}

interface UsePosKeyboardShortcutsParams {
  confirmPaymentButtonRef: React.RefObject<HTMLButtonElement | null>;
  startNewSaleButtonRef: React.RefObject<HTMLButtonElement | null>;
  isSubmittingInvoiceRef: React.MutableRefObject<boolean>;
  startNewSaleRef: React.MutableRefObject<(() => Promise<void>) | null>;
  ctx: PosKeyboardShortcutContext;
}

export function usePosKeyboardShortcuts({
  confirmPaymentButtonRef,
  startNewSaleButtonRef,
  isSubmittingInvoiceRef,
  startNewSaleRef,
  ctx,
}: UsePosKeyboardShortcutsParams): void {
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'F1' && e.key !== 'F2') return;

      const c = ctxRef.current;

      if (e.key === 'F1') {
        e.preventDefault();
        if (e.repeat) return;
        if (c.isProcessingPayment || isSubmittingInvoiceRef.current) return;

        if (c.paymentConfirmationModalOpen) {
          void c.handlePaymentConfirmationConfirm();
          return;
        }

        if (c.hasUnsyncedSales) return;

        const confirmBtn = confirmPaymentButtonRef.current;
        if (confirmBtn && !confirmBtn.disabled) {
          confirmBtn.click();
        }
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        if (e.repeat) return;
        if (c.isProcessingPayment || isSubmittingInvoiceRef.current) return;

        const newSaleBtn = startNewSaleButtonRef.current;
        if (newSaleBtn && !newSaleBtn.disabled) {
          newSaleBtn.click();
          return;
        }

        void startNewSaleRef.current?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    confirmPaymentButtonRef,
    startNewSaleButtonRef,
    isSubmittingInvoiceRef,
    startNewSaleRef,
  ]);
}
