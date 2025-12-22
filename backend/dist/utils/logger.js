"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var logger_exports = {};
__export(logger_exports, {
  default: () => logger_default,
  log: () => log
});
module.exports = __toCommonJS(logger_exports);
var import_winston = __toESM(require("winston"));
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
  /social[_-]?security/gi
];
const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
  "authorization",
  "authToken",
  "jwt",
  "privateKey",
  "creditCard",
  "cardNumber",
  "cvv",
  "cvc",
  "ssn"
];
function sanitizeData(data) {
  if (!data) return data;
  if (typeof data === "string") {
    let sanitized = data;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    }
    if (/^[A-Za-z0-9_-]{20,}$/.test(data)) {
      return "[REDACTED_TOKEN]";
    }
    return sanitized;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }
  if (typeof data === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "string" && value.length > 50 && /^[A-Za-z0-9_-]+$/.test(value)) {
        sanitized[key] = "[REDACTED_TOKEN]";
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }
  return data;
}
const sanitizeFormat = import_winston.default.format((info) => {
  if (info.message && typeof info.message === "object") {
    info.message = sanitizeData(info.message);
  }
  const splatSymbol = /* @__PURE__ */ Symbol.for("splat");
  if (info[splatSymbol] && Array.isArray(info[splatSymbol])) {
    info[splatSymbol] = info[splatSymbol].map((arg) => sanitizeData(arg));
  }
  return info;
});
function getLogLevel() {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  const isProduction = process.env.NODE_ENV === "production";
  if (envLevel && ["error", "warn", "info", "debug"].includes(envLevel)) {
    return envLevel;
  }
  if (isProduction) {
    return "warn";
  }
  return "debug";
}
const logger = import_winston.default.createLogger({
  level: getLogLevel(),
  format: import_winston.default.format.combine(
    sanitizeFormat(),
    import_winston.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    import_winston.default.format.errors({ stack: true }),
    import_winston.default.format.splat(),
    import_winston.default.format.json()
  ),
  defaultMeta: { service: "pos-backend" },
  transports: [
    // Write all logs to console with colorized output in development
    new import_winston.default.transports.Console({
      format: import_winston.default.format.combine(
        sanitizeFormat(),
        import_winston.default.format.colorize(),
        import_winston.default.format.printf(({ timestamp, level, message, ...meta }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          const cleanMeta = { ...meta };
          delete cleanMeta.service;
          const splatSymbol = /* @__PURE__ */ Symbol.for("splat");
          delete cleanMeta[splatSymbol];
          const metaKeys = Object.keys(cleanMeta);
          if (metaKeys.length > 0) {
            msg += ` ${JSON.stringify(cleanMeta)}`;
          }
          return msg;
        })
      )
    })
  ],
  // Don't exit on handled exceptions
  exitOnError: false
});
const log = {
  /**
   * Log debug messages (development only)
   */
  debug: (message, ...args) => {
    logger.debug(message, ...args.map((arg) => sanitizeData(arg)));
  },
  /**
   * Log info messages (development only)
   */
  info: (message, ...args) => {
    logger.info(message, ...args.map((arg) => sanitizeData(arg)));
  },
  /**
   * Log warning messages (development and production)
   */
  warn: (message, ...args) => {
    logger.warn(message, ...args.map((arg) => sanitizeData(arg)));
  },
  /**
   * Log error messages (development and production)
   */
  error: (message, error, ...args) => {
    const errorData = { message };
    if (error) {
      if (error instanceof Error) {
        errorData.error = {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === "development" ? error.stack : void 0
        };
      } else {
        errorData.error = sanitizeData(error);
      }
    }
    if (args.length > 0) {
      errorData.meta = args.map((arg) => sanitizeData(arg));
    }
    logger.error(message, errorData);
  }
};
var logger_default = logger;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  log
});
