/**
 * Controlled-input names that must stay exact strings (leading zeros, passwords).
 * Never pass these through parseFloat / Number.
 */
export const STRING_IDENTITY_INPUT_NAMES = new Set<string>([
  'primaryBarcode',
  'barcode',
  'baseBarcode',
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
]);

/**
 * Maps (name, type, value) from a controlled input to the value to store in state.
 */
export function coerceFormInputValue(name: string, type: string, value: string): string | number {
  if (STRING_IDENTITY_INPUT_NAMES.has(name)) {
    return value;
  }
  if (type === 'number') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return value;
}
