/**
 * iOS 16.4+ Web Push works only for PWAs added to the Home Screen (standalone).
 * Permission must be requested from a user gesture (e.g. button tap), not from a delayed effect.
 */

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  // iPadOS 13+ may report as Mac with touch
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  return false;
}

/** True when the app runs as an installed PWA (Home Screen). */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

/** iOS Safari / WebKit where push must use the manual (button) flow. */
export function shouldUseManualPushSubscription(): boolean {
  return isIosDevice();
}
