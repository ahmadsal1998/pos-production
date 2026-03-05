import React, { forwardRef, useCallback } from 'react';

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Numeric input with consistent behavior across the app:
 * - When value is 0, first digit key replaces 0 instead of appending (e.g. typing "2" gives 2, not 20)
 * - Mouse wheel does not change the value
 * - On focus when value is 0, selects all for easy replacement
 */
export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, onFocus, onKeyDown, onWheel, ...rest }, ref) => {
    const numValue = typeof value === 'string' ? value : String(value);
    const isZero =
      value === 0 ||
      value === '0' ||
      numValue === '' ||
      (typeof value === 'number' && value === 0);

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (isZero) {
          e.target.select();
        }
        onFocus?.(e);
      },
      [isZero, onFocus]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (isZero && /^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          const synthetic = {
            target: { value: e.key },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(synthetic);
        }
        onKeyDown?.(e);
      },
      [isZero, onChange, onKeyDown]
    );

    const handleWheel = useCallback(
      (e: React.WheelEvent<HTMLInputElement>) => {
        e.preventDefault();
        onWheel?.(e);
      },
      [onWheel]
    );

    return (
      <input
        ref={ref}
        type="number"
        value={numValue}
        onChange={onChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        {...rest}
      />
    );
  }
);

NumericInput.displayName = 'NumericInput';
