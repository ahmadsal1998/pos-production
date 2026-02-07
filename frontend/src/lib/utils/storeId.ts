import { safeDecodeAuthToken } from './authToken';

/**
 * Get current store ID from JWT in localStorage.
 * Uses safe decode; invalid tokens are cleared automatically.
 */
export function getStoreIdFromToken(): string | null {
  const payload = safeDecodeAuthToken();
  if (!payload || typeof payload.storeId !== 'string') return null;
  return payload.storeId;
}
