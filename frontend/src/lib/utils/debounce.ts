/**
 * Debounce utility for batching rapid changes
 */

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * 
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced: DebouncedFunction<T> = function (...args: Parameters<T>) {
    lastArgs = args;
    
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...lastArgs!);
      timeoutId = null;
      lastArgs = null;
    }, wait);
  } as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  debounced.flush = () => {
    if (timeoutId !== null && lastArgs !== null) {
      clearTimeout(timeoutId);
      func(...lastArgs);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return debounced;
}

/**
 * Creates a batched function that collects multiple calls and executes them together
 * Useful for batching multiple rapid changes into a single operation
 */
export function batch<T>(
  processor: (items: T[]) => Promise<void> | void,
  wait: number = 1000
): (item: T) => void {
  let batch: T[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (batch.length > 0) {
      const items = [...batch];
      batch = [];
      processor(items);
    }
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return (item: T) => {
    batch.push(item);

    if (timeoutId === null) {
      timeoutId = setTimeout(flush, wait);
    }
  };
}

