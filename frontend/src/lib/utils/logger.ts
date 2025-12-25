/**
 * Production-safe logger utility
 * Only shows debug logs in development mode
 * Critical errors and warnings are always logged
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  log: (...args: any[]) => void;
}

class ProductionLogger implements Logger {
  debug(...args: any[]): void {
    // Only log in development
    if (isDevelopment) {
      console.debug(...args);
    }
  }

  info(...args: any[]): void {
    // Only log in development
    if (isDevelopment) {
      console.info(...args);
    }
  }

  warn(...args: any[]): void {
    // Warnings are always logged (important for production debugging)
    console.warn(...args);
  }

  error(...args: any[]): void {
    // Errors are always logged (critical)
    console.error(...args);
  }

  log(...args: any[]): void {
    // Regular logs only in development
    if (isDevelopment) {
      console.log(...args);
    }
  }
}

// Export singleton logger instance
export const logger = new ProductionLogger();

// Export environment checkers
export const isDev = () => isDevelopment;
export const isProd = () => isProduction;

