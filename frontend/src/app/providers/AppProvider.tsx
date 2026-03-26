// Application-level configuration and providers
import React, { useEffect } from 'react';
import { DropdownProvider } from '@/shared/contexts/DropdownContext';
import { CurrencyProvider } from '@/shared/contexts/CurrencyContext';
import { ConfirmDialogProvider } from '@/shared/contexts/ConfirmDialogContext';
import { salesSync } from '@/lib/sync/salesSync';
import { inventorySync } from '@/lib/sync/inventorySync';

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Initialize sync services on app load
  useEffect(() => {
    // Initialize sales sync
    salesSync.init().catch((error) => {
      console.error('Failed to initialize sales sync:', error);
    });

    // Initialize inventory sync
    inventorySync.initService().catch((error) => {
      console.error('Failed to initialize inventory sync:', error);
    });
  }, []);

  // Global behavior for all numeric inputs: replace 0 when typing first digit, disable wheel, select on focus when 0
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        e.preventDefault();
      }
    };

    /** True only for empty or all-zero integer display — not decimals (0.5, 1.2, 0.0, 0., …). */
    const isEmptyOrZeroIntegerField = (raw: string): boolean => {
      const val = raw.trim();
      if (val.includes('.')) return false;
      if (val === '') return true;
      if (val === '0') return true;
      return /^0+$/.test(val);
    };

    const onFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (
        target?.tagName === 'INPUT' &&
        target.type === 'number' &&
        isEmptyOrZeroIntegerField(target.value)
      ) {
        target.select();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLInputElement;
      if (
        target?.tagName !== 'INPUT' ||
        target.type === 'number' ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      ) {
        return;
      }
      const val = target.value;
      if (!isEmptyOrZeroIntegerField(val) || !/^[1-9]$/.test(e.key)) {
        return;
      }
      e.preventDefault();
      target.value = e.key;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    };

    document.addEventListener('wheel', onWheel, { capture: true, passive: false });
    document.addEventListener('focus', onFocus, true);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('wheel', onWheel, { capture: true });
      document.removeEventListener('focus', onFocus, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, []);

  return (
    <CurrencyProvider>
      <DropdownProvider>
        <ConfirmDialogProvider>
          <div className="app">{children}</div>
        </ConfirmDialogProvider>
      </DropdownProvider>
    </CurrencyProvider>
  );
};
