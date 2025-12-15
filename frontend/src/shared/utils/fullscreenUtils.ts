/**
 * Cross-browser fullscreen API utilities
 * Handles vendor prefixes and mobile browser compatibility
 */

interface FullscreenAPI {
  requestFullscreen: (element: HTMLElement) => Promise<void>;
  exitFullscreen: () => Promise<void>;
  fullscreenElement: Element | null;
  fullscreenEnabled: boolean;
  fullscreenchange: string;
  fullscreenerror: string;
}

/**
 * Get the appropriate fullscreen API for the current browser
 */
function getFullscreenAPI(): FullscreenAPI | null {
  const doc = document as any;
  const docEl = document.documentElement as any;

  // Standard API
  if (doc.fullscreenEnabled !== undefined) {
    return {
      requestFullscreen: (element: HTMLElement) => element.requestFullscreen(),
      exitFullscreen: () => document.exitFullscreen(),
      fullscreenElement: document.fullscreenElement,
      fullscreenEnabled: doc.fullscreenEnabled,
      fullscreenchange: 'fullscreenchange',
      fullscreenerror: 'fullscreenerror',
    };
  }

  // WebKit (Safari, Chrome on iOS)
  if (doc.webkitFullscreenEnabled !== undefined) {
    return {
      requestFullscreen: (element: HTMLElement) => (element as any).webkitRequestFullscreen(),
      exitFullscreen: () => (document as any).webkitExitFullscreen(),
      fullscreenElement: doc.webkitFullscreenElement,
      fullscreenEnabled: doc.webkitFullscreenEnabled,
      fullscreenchange: 'webkitfullscreenchange',
      fullscreenerror: 'webkitfullscreenerror',
    };
  }

  // Mozilla (Firefox)
  if ((doc as any).mozFullScreenEnabled !== undefined) {
    return {
      requestFullscreen: (element: HTMLElement) => (element as any).mozRequestFullScreen(),
      exitFullscreen: () => (document as any).mozCancelFullScreen(),
      fullscreenElement: (doc as any).mozFullScreenElement,
      fullscreenEnabled: (doc as any).mozFullScreenEnabled,
      fullscreenchange: 'mozfullscreenchange',
      fullscreenerror: 'mozfullscreenerror',
    };
  }

  // MS (IE/Edge Legacy)
  if ((doc as any).msFullscreenEnabled !== undefined) {
    return {
      requestFullscreen: (element: HTMLElement) => (element as any).msRequestFullscreen(),
      exitFullscreen: () => (document as any).msExitFullscreen(),
      fullscreenElement: (doc as any).msFullscreenElement,
      fullscreenEnabled: (doc as any).msFullscreenEnabled,
      fullscreenchange: 'MSFullscreenChange',
      fullscreenerror: 'MSFullscreenError',
    };
  }

  return null;
}

/**
 * Check if fullscreen is currently active
 */
export function isFullscreen(): boolean {
  const api = getFullscreenAPI();
  if (!api) return false;
  return api.fullscreenElement !== null;
}

/**
 * Check if fullscreen is supported
 */
export function isFullscreenSupported(): boolean {
  const api = getFullscreenAPI();
  return api !== null && api.fullscreenEnabled;
}

/**
 * Request fullscreen mode
 */
export async function requestFullscreen(element: HTMLElement = document.documentElement): Promise<void> {
  const api = getFullscreenAPI();
  
  if (!api) {
    // Fallback for browsers that don't support fullscreen
    // Try to maximize viewport on mobile
    if (isMobileDevice()) {
      // On mobile, we can try to hide browser UI elements
      // This is limited but better than nothing
      try {
        // Try to scroll to top to minimize browser chrome
        window.scrollTo(0, 0);
        // Some mobile browsers support this meta tag approach
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        }
      } catch (error) {
        console.warn('Fullscreen not supported, and mobile fallback failed:', error);
      }
    }
    throw new Error('Fullscreen API is not supported in this browser');
  }

  if (!api.fullscreenEnabled) {
    throw new Error('Fullscreen is not enabled');
  }

  try {
    await api.requestFullscreen(element);
  } catch (error: any) {
    // On mobile, some browsers require user gesture
    // If it fails, provide helpful error message
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      throw new Error('Fullscreen request was denied. Please ensure it\'s triggered by a user action.');
    }
    throw error;
  }
}

/**
 * Exit fullscreen mode
 */
export async function exitFullscreen(): Promise<void> {
  const api = getFullscreenAPI();
  
  if (!api) {
    throw new Error('Fullscreen API is not supported in this browser');
  }

  try {
    await api.exitFullscreen();
  } catch (error) {
    console.error('Error exiting fullscreen:', error);
    throw error;
  }
}

/**
 * Toggle fullscreen mode
 */
export async function toggleFullscreen(element: HTMLElement = document.documentElement): Promise<void> {
  if (isFullscreen()) {
    await exitFullscreen();
  } else {
    await requestFullscreen(element);
  }
}

/**
 * Get the fullscreen change event name for the current browser
 */
export function getFullscreenChangeEventName(): string {
  const api = getFullscreenAPI();
  return api?.fullscreenchange || 'fullscreenchange';
}

/**
 * Get the fullscreen error event name for the current browser
 */
export function getFullscreenErrorEventName(): string {
  const api = getFullscreenAPI();
  return api?.fullscreenerror || 'fullscreenerror';
}

/**
 * Check if device is mobile
 */
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
}

