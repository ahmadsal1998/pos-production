/// <reference types="vite/client" />

// Extend Window interface for requestIdleCallback
interface Window {
  requestIdleCallback?: (
    callback: (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void,
    options?: { timeout?: number }
  ) => number;
  cancelIdleCallback?: (id: number) => void;
}


