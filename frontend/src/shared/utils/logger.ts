/**
 * Frontend logging utility
 * Respects NODE_ENV to control logging behavior
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

/**
 * Sanitize sensitive data from logs
 */
function sanitizeData(data: any): any {
  if (!data) return data;

  if (typeof data === 'string') {
    // If it looks like a token (long alphanumeric string), redact it
    if (/^[A-Za-z0-9_-]{20,}$/.test(data)) {
      return '[REDACTED_TOKEN]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Redact sensitive fields
      if (lowerKey.includes('token') || lowerKey.includes('password') || lowerKey.includes('secret')) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 50 && /^[A-Za-z0-9_-]+$/.test(value)) {
        sanitized[key] = '[REDACTED_TOKEN]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }

  return data;
}

export const log = {
  /**
   * Log debug messages (development only)
   */
  debug: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, ...args.map(arg => sanitizeData(arg)));
    }
  },

  /**
   * Log info messages (development only)
   */
  info: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, ...args.map(arg => sanitizeData(arg)));
    }
  },

  /**
   * Log warning messages (always shown)
   */
  warn: (message: string, ...args: any[]): void => {
    console.warn(`[WARN] ${message}`, ...args.map(arg => sanitizeData(arg)));
  },

  /**
   * Log error messages (always shown)
   */
  error: (message: string, error?: Error | any, ...args: any[]): void => {
    const errorData: any = { message };
    
    if (error) {
      if (error instanceof Error) {
        errorData.error = {
          name: error.name,
          message: error.message,
          stack: isDevelopment ? error.stack : undefined,
        };
      } else {
        errorData.error = sanitizeData(error);
      }
    }
    
    if (args.length > 0) {
      errorData.meta = args.map(arg => sanitizeData(arg));
    }
    
    console.error(`[ERROR] ${message}`, errorData);
  },
};

export default log;

