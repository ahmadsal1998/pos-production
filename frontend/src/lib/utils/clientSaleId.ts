/**
 * Generate a unique client sale ID for idempotent sale creation.
 * Same ID must be reused on retries and sync so the backend can detect duplicates.
 */
export function generateClientSaleId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'sale_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}
