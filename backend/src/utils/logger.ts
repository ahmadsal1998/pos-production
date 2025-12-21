import winston from 'winston';

// Sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
  /password/gi,
  /token/gi,
  /secret/gi,
  /api[_-]?key/gi,
  /authorization/gi,
  /auth[_-]?token/gi,
  /refresh[_-]?token/gi,
  /access[_-]?token/gi,
  /bearer/gi,
  /jwt/gi,
  /private[_-]?key/gi,
  /credit[_-]?card/gi,
  /card[_-]?number/gi,
  /cvv/gi,
  /cvc/gi,
  /ssn/gi,
  /social[_-]?security/gi,
];

// Fields that commonly contain sensitive data
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'authToken',
  'jwt',
  'privateKey',
  'creditCard',
  'cardNumber',
  'cvv',
  'cvc',
  'ssn',
];

/**
 * Sanitize an object by redacting sensitive fields
 */
function sanitizeData(data: any): any {
  if (!data) return data;

  // Handle strings - check for sensitive patterns
  if (typeof data === 'string') {
    let sanitized = data;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    // If it looks like a token (long alphanumeric string), redact it
    if (/^[A-Za-z0-9_-]{20,}$/.test(data)) {
      return '[REDACTED_TOKEN]';
    }
    return sanitized;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  // Handle objects
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Check if the key itself indicates sensitive data
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 50 && /^[A-Za-z0-9_-]+$/.test(value)) {
        // Long token-like strings
        sanitized[key] = '[REDACTED_TOKEN]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Custom format that sanitizes sensitive data
 */
const sanitizeFormat = winston.format((info: any) => {
  if (info.message && typeof info.message === 'object') {
    info.message = sanitizeData(info.message);
  }
  const splatSymbol = Symbol.for('splat');
  if (info[splatSymbol] && Array.isArray(info[splatSymbol])) {
    info[splatSymbol] = info[splatSymbol].map((arg: any) => sanitizeData(arg));
  }
  return info;
});

/**
 * Determine the log level based on environment and LOG_LEVEL env variable
 */
function getLogLevel(): string {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  const isProduction = process.env.NODE_ENV === 'production';

  // If LOG_LEVEL is explicitly set, use it
  if (envLevel && ['error', 'warn', 'info', 'debug'].includes(envLevel)) {
    return envLevel;
  }

  // In production, default to 'warn' (only warnings and errors)
  if (isProduction) {
    return 'warn';
  }

  // In development, default to 'debug' (all logs)
  return 'debug';
}

/**
 * Create and configure Winston logger
 */
const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    sanitizeFormat(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'pos-backend' },
  transports: [
    // Write all logs to console with colorized output in development
    new winston.transports.Console({
      format: winston.format.combine(
        sanitizeFormat(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }: any) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          // Only include metadata if it exists and is not empty
          // Remove known internal keys (service, splat symbol) before stringifying
          const cleanMeta = { ...meta };
          delete cleanMeta.service;
          const splatSymbol = Symbol.for('splat');
          delete cleanMeta[splatSymbol];
          const metaKeys = Object.keys(cleanMeta);
          if (metaKeys.length > 0) {
            msg += ` ${JSON.stringify(cleanMeta)}`;
          }
          return msg;
        })
      ),
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

/**
 * Logging utility with methods for different log levels
 * All methods automatically sanitize sensitive data
 */
export const log = {
  /**
   * Log debug messages (development only)
   */
  debug: (message: string, ...args: any[]): void => {
    logger.debug(message, ...args.map(arg => sanitizeData(arg)));
  },

  /**
   * Log info messages (development only)
   */
  info: (message: string, ...args: any[]): void => {
    logger.info(message, ...args.map(arg => sanitizeData(arg)));
  },

  /**
   * Log warning messages (development and production)
   */
  warn: (message: string, ...args: any[]): void => {
    logger.warn(message, ...args.map(arg => sanitizeData(arg)));
  },

  /**
   * Log error messages (development and production)
   */
  error: (message: string, error?: Error | any, ...args: any[]): void => {
    const errorData: any = { message };
    
    if (error) {
      if (error instanceof Error) {
        errorData.error = {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        };
      } else {
        errorData.error = sanitizeData(error);
      }
    }
    
    if (args.length > 0) {
      errorData.meta = args.map(arg => sanitizeData(arg));
    }
    
    logger.error(message, errorData);
  },
};

export default logger;

