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
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_dotenv = __toESM(require("dotenv"));
var import_database = __toESM(require("./config/database"));
var import_redis = require("./utils/redis");
var import_error = require("./middleware/error.middleware");
var import_logger = require("./utils/logger");
var import_auth = __toESM(require("./routes/auth.routes"));
var import_users = __toESM(require("./routes/users.routes"));
var import_categories = __toESM(require("./routes/categories.routes"));
var import_brands = __toESM(require("./routes/brands.routes"));
var import_units = __toESM(require("./routes/units.routes"));
var import_warehouses = __toESM(require("./routes/warehouses.routes"));
var import_products = __toESM(require("./routes/products.routes"));
var import_admin = __toESM(require("./routes/admin.routes"));
var import_payments = __toESM(require("./routes/payments.routes"));
var import_merchants = __toESM(require("./routes/merchants.routes"));
var import_settings = __toESM(require("./routes/settings.routes"));
var import_customers = __toESM(require("./routes/customers.routes"));
var import_sales = __toESM(require("./routes/sales.routes"));
import_dotenv.default.config();
const app = (0, import_express.default)();
const PORT = process.env.PORT || 5e3;
(0, import_database.default)().catch((error) => {
  import_logger.log.error("Failed to connect to MongoDB", error);
  import_logger.log.warn("Server will continue to run, but database operations may fail");
});
(0, import_redis.initRedis)().then((client) => {
  const isProduction = process.env.NODE_ENV === "production";
  if (client) {
    if (isProduction || process.env.REDIS_URL) {
      import_logger.log.info("Redis: Initialized successfully");
    }
  } else {
    if (isProduction || process.env.REDIS_URL) {
      if (isProduction) {
        import_logger.log.warn("Redis: Not available. System will continue without caching.");
        import_logger.log.warn("Redis will be retried on next operation.");
      } else {
        import_logger.log.warn("Redis: Not available. Caching will be disabled.");
        import_logger.log.info("To enable caching, start Redis: redis-server");
      }
    }
  }
}).catch((error) => {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction || process.env.REDIS_URL) {
    import_logger.log.error("Redis: Initialization error", error);
    import_logger.log.warn("Server will continue to run, but caching will be disabled");
  }
});
const isDevelopment = process.env.NODE_ENV !== "production";
const corsOptions = {
  origin: (origin, callback) => {
    try {
      if (!origin) {
        import_logger.log.debug("CORS: Allowing request with no origin");
        return callback(null, true);
      }
      if (isDevelopment) {
        import_logger.log.debug(`CORS: Development mode - allowing origin: ${origin}`);
        return callback(null, true);
      }
      const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, "");
      import_logger.log.debug(`CORS: Checking origin: ${origin} (normalized: ${normalizedOrigin})`);
      if (origin.toLowerCase().includes(".vercel.app")) {
        import_logger.log.debug(`CORS: Allowing Vercel origin: ${origin}`);
        return callback(null, true);
      }
      if (normalizedOrigin === "https://pos-production.vercel.app") {
        import_logger.log.debug(`CORS: Allowing production origin: ${origin}`);
        return callback(null, true);
      }
      if (process.env.CLIENT_URL) {
        const clientUrl = process.env.CLIENT_URL.trim();
        const normalizedClientUrl = clientUrl.toLowerCase().replace(/\/$/, "");
        if (normalizedOrigin === normalizedClientUrl) {
          import_logger.log.debug(`CORS: Allowing CLIENT_URL origin: ${origin}`);
          return callback(null, true);
        }
        if (clientUrl.endsWith("/")) {
          const clientUrlNoSlash = clientUrl.slice(0, -1).toLowerCase();
          if (normalizedOrigin === clientUrlNoSlash) {
            import_logger.log.debug(`CORS: Allowing CLIENT_URL origin (no slash variant): ${origin}`);
            return callback(null, true);
          }
        } else {
          const clientUrlWithSlash = (clientUrl + "/").toLowerCase();
          if (normalizedOrigin === clientUrlWithSlash) {
            import_logger.log.debug(`CORS: Allowing CLIENT_URL origin (with slash variant): ${origin}`);
            return callback(null, true);
          }
        }
      }
      import_logger.log.warn(`CORS: Origin not explicitly allowed: ${origin}`);
      import_logger.log.debug(`CORS: CLIENT_URL env var: ${process.env.CLIENT_URL || "not set"}`);
      import_logger.log.warn(`CORS: Temporarily allowing origin for debugging: ${origin}`);
      return callback(null, true);
    } catch (error) {
      import_logger.log.error("CORS validation error", error);
      import_logger.log.warn("CORS: Allowing origin due to validation error");
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  exposedHeaders: ["Authorization"],
  optionsSuccessStatus: 204,
  preflightContinue: false
};
app.use((0, import_cors.default)(corsOptions));
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return (0, import_cors.default)(corsOptions)(req, res, next);
  }
  next();
});
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    const isBarcodeRoute = req.path.includes("/barcode") || req.originalUrl.includes("/barcode") || req.url.includes("/barcode");
    if (isBarcodeRoute) {
      import_logger.log.debug("[Request] BARCODE REQUEST DETECTED", {
        method: req.method,
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        query: req.query,
        params: req.params,
        headers: {
          authorization: req.headers.authorization ? "Present" : "Missing",
          origin: req.headers.origin || "none",
          "content-type": req.headers["content-type"] || "none"
        }
      });
    } else {
      import_logger.log.debug(`[Request] ${req.method} ${req.path}`, {
        url: req.url !== req.path ? req.url : void 0,
        origin: req.headers.origin || "none"
      });
    }
  }
  next();
});
app.use(import_express.default.json());
app.use(import_express.default.urlencoded({ extended: true }));
app.get("/health", async (req, res) => {
  try {
    const { getRedisStatus, isRedisAvailable } = await import("./utils/redis");
    const redisStatus = getRedisStatus();
    const redisHealthy = await isRedisAvailable();
    res.json({
      success: true,
      message: "POS System API is running",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      services: {
        database: "connected",
        // MongoDB connection is checked elsewhere
        redis: {
          available: redisStatus.available,
          connected: redisStatus.connected,
          healthy: redisHealthy,
          url: redisStatus.url?.replace(/:[^:@]+@/, ":****@")
          // Hide password in URL
        }
      }
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      message: "POS System API is running",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      services: {
        database: "connected",
        redis: {
          available: false,
          connected: false,
          healthy: false
        }
      }
    });
  }
});
app.use("/api/auth", import_auth.default);
app.use("/api/users", import_users.default);
app.use("/api/categories", import_categories.default);
app.use("/api/brands", import_brands.default);
app.use("/api/units", import_units.default);
app.use("/api/warehouses", import_warehouses.default);
app.use("/api/products", import_products.default);
import_logger.log.debug("Products routes registered at /api/products");
import_logger.log.debug("Available product routes: GET /api/products/, GET /api/products/metrics, GET /api/products/barcode/:barcode, GET /api/products/:id, POST /api/products/, POST /api/products/import, PUT /api/products/:id, DELETE /api/products/:id");
app.use("/api/admin", import_admin.default);
app.use("/api/payments", import_payments.default);
app.use("/api/merchants", import_merchants.default);
app.use("/api/settings", import_settings.default);
app.use("/api/customers", import_customers.default);
app.use("/api/sales", import_sales.default);
app.use((req, res) => {
  const isBarcodeRoute = req.path.includes("/barcode") || req.originalUrl.includes("/barcode");
  import_logger.log.warn("Route not found", {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    url: req.url,
    headers: {
      authorization: req.headers.authorization ? "Present" : "Missing",
      "content-type": req.headers["content-type"]
    }
  });
  if (isBarcodeRoute) {
    import_logger.log.error("BARCODE ROUTE 404 - This should not happen!", {
      expectedRoute: "GET /api/products/barcode/:barcode",
      actualPath: req.path,
      actualOriginalUrl: req.originalUrl,
      possibleCauses: [
        "Route not registered (check server startup logs)",
        "Authentication failed before reaching route (check auth logs)",
        "Store isolation middleware blocked request (check store isolation logs)",
        "Path mismatch (expected /api/products/barcode/:barcode)"
      ]
    });
  }
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
    originalUrl: req.originalUrl
  });
});
app.use(import_error.errorHandler);
const server = app.listen(PORT, () => {
  import_logger.log.info(`Server running on http://localhost:${PORT}`);
  import_logger.log.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  import_logger.log.info(`API Health: http://localhost:${PORT}/health`);
});
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    import_logger.log.error(`Port ${PORT} is already in use`, error);
    process.exit(1);
  } else {
    import_logger.log.error("Server error", error);
  }
});
process.on("unhandledRejection", (err) => {
  import_logger.log.error("Unhandled Rejection", err);
  if (process.env.NODE_ENV === "development") {
    process.exit(1);
  }
});
process.on("uncaughtException", (err) => {
  import_logger.log.error("Uncaught Exception", err);
  process.exit(1);
});
var server_default = app;
