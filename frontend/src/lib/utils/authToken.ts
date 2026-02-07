/**
 * Safe JWT decode for auth token in localStorage.
 * On invalid or malformed token, clears auth tokens and returns null.
 * Use this whenever decoding the auth token so invalid tokens are always cleared.
 */
export function safeDecodeAuthToken(): Record<string, unknown> | null {
  if (typeof localStorage === 'undefined') return null;
  const token = localStorage.getItem('auth-token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload as Record<string, unknown>;
  } catch {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-refresh-token');
    return null;
  }
}
