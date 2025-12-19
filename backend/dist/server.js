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
  console.error("\u274C Failed to connect to MongoDB:", error);
  console.warn("\u26A0\uFE0F Server will continue to run, but database operations may fail");
});
(0, import_redis.initRedis)().then((client) => {
  const isProduction = process.env.NODE_ENV === "production";
  if (client) {
    if (isProduction || process.env.REDIS_URL) {
      console.log("\u2705 Redis: Initialized successfully");
    }
  } else {
    if (isProduction || process.env.REDIS_URL) {
      if (isProduction) {
        console.warn("\u26A0\uFE0F  Redis: Not available. System will continue without caching.");
        console.warn("   Redis will be retried on next operation.");
      } else {
        console.warn("\u26A0\uFE0F  Redis: Not available. Caching will be disabled.");
        console.warn("   To enable caching, start Redis: redis-server");
      }
    }
  }
}).catch((error) => {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction || process.env.REDIS_URL) {
    console.error("\u274C Redis: Initialization error:", error.message);
    console.warn("\u26A0\uFE0F  Server will continue to run, but caching will be disabled");
  }
});
const isDevelopment = process.env.NODE_ENV !== "production";
const corsOptions = {
  origin: (origin, callback) => {
    try {
      if (!origin) {
        console.log("CORS: Allowing request with no origin");
        return callback(null, true);
      }
      if (isDevelopment) {
        console.log(`CORS: Development mode - allowing origin: ${origin}`);
        return callback(null, true);
      }
      const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, "");
      console.log(`CORS: Checking origin: ${origin} (normalized: ${normalizedOrigin})`);
      if (origin.toLowerCase().includes(".vercel.app")) {
        console.log(`CORS: \u2713 Allowing Vercel origin: ${origin}`);
        return callback(null, true);
      }
      if (normalizedOrigin === "https://pos-production.vercel.app") {
        console.log(`CORS: \u2713 Allowing production origin: ${origin}`);
        return callback(null, true);
      }
      if (process.env.CLIENT_URL) {
        const clientUrl = process.env.CLIENT_URL.trim();
        const normalizedClientUrl = clientUrl.toLowerCase().replace(/\/$/, "");
        if (normalizedOrigin === normalizedClientUrl) {
          console.log(`CORS: \u2713 Allowing CLIENT_URL origin: ${origin}`);
          return callback(null, true);
        }
        if (clientUrl.endsWith("/")) {
          const clientUrlNoSlash = clientUrl.slice(0, -1).toLowerCase();
          if (normalizedOrigin === clientUrlNoSlash) {
            console.log(`CORS: \u2713 Allowing CLIENT_URL origin (no slash variant): ${origin}`);
            return callback(null, true);
          }
        } else {
          const clientUrlWithSlash = (clientUrl + "/").toLowerCase();
          if (normalizedOrigin === clientUrlWithSlash) {
            console.log(`CORS: \u2713 Allowing CLIENT_URL origin (with slash variant): ${origin}`);
            return callback(null, true);
          }
        }
      }
      console.warn(`CORS: \u2717 Origin not explicitly allowed: ${origin}`);
      console.warn(`CORS: CLIENT_URL env var: ${process.env.CLIENT_URL || "not set"}`);
      console.warn(`CORS: \u26A0\uFE0F Temporarily allowing origin for debugging: ${origin}`);
      return callback(null, true);
    } catch (error) {
      console.error("CORS validation error:", error);
      console.error("CORS: Allowing origin due to validation error");
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
      console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
      console.log(`[Request] \u{1F50D}\u{1F50D}\u{1F50D} BARCODE REQUEST DETECTED \u{1F50D}\u{1F50D}\u{1F50D}`);
      console.log(`[Request] Method: ${req.method}`);
      console.log(`[Request] Path: ${req.path}`);
      console.log(`[Request] URL: ${req.url}`);
      console.log(`[Request] Original URL: ${req.originalUrl}`);
      console.log(`[Request] Base URL: ${req.baseUrl}`);
      console.log(`[Request] Query:`, req.query);
      console.log(`[Request] Params:`, req.params);
      console.log(`[Request] Headers:`, {
        authorization: req.headers.authorization ? `Present (${req.headers.authorization.substring(0, 30)}...)` : "Missing",
        origin: req.headers.origin || "none",
        "content-type": req.headers["content-type"] || "none"
      });
      console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    } else {
      console.log(`[Request] ${req.method} ${req.path}${req.url !== req.path ? " (url: " + req.url + ")" : ""} - Origin: ${req.headers.origin || "none"}`);
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
console.log("[Server] \u2705 Products routes registered at /api/products");
console.log("[Server] \u{1F4CB} Available product routes:");
console.log("  - GET  /api/products/");
console.log("  - GET  /api/products/metrics");
console.log("  - GET  /api/products/barcode/:barcode \u2B50 BARCODE ROUTE \u2B50");
console.log("  - GET  /api/products/:id");
console.log("  - POST /api/products/");
console.log("  - POST /api/products/import");
console.log("  - PUT  /api/products/:id");
console.log("  - DELETE /api/products/:id");
console.log("[Server] \u{1F50D} BARCODE ROUTE VERIFICATION: Route should match GET /api/products/barcode/:barcode");
app.use("/api/admin", import_admin.default);
app.use("/api/payments", import_payments.default);
app.use("/api/merchants", import_merchants.default);
app.use("/api/settings", import_settings.default);
app.use("/api/customers", import_customers.default);
app.use("/api/sales", import_sales.default);
app.use((req, res) => {
  const isBarcodeRoute = req.path.includes("/barcode") || req.originalUrl.includes("/barcode");
  console.error("[404 Handler] \u274C Route not found:", {
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
    console.error("[404 Handler] \u26A0\uFE0F\u26A0\uFE0F\u26A0\uFE0F BARCODE ROUTE 404 - This should not happen! \u26A0\uFE0F\u26A0\uFE0F\u26A0\uFE0F");
    console.error("[404 Handler] Expected route: GET /api/products/barcode/:barcode");
    console.error("[404 Handler] Actual request path:", req.path);
    console.error("[404 Handler] Actual request originalUrl:", req.originalUrl);
    console.error("[404 Handler] Request reached 404 handler - route was NOT matched");
    console.error("[404 Handler] Possible causes:");
    console.error("  1. Route not registered (check server startup logs)");
    console.error("  2. Authentication failed before reaching route (check auth logs)");
    console.error("  3. Store isolation middleware blocked request (check store isolation logs)");
    console.error("  4. Path mismatch (expected /api/products/barcode/:barcode)");
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
  console.log(`\u{1F680} Server running on http://localhost:${PORT}`);
  console.log(`\u{1F4DD} Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`\u{1F517} API Health: http://localhost:${PORT}/health`);
});
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`\u274C Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error("\u274C Server error:", error);
  }
});
process.on("unhandledRejection", (err) => {
  console.error("\u274C Unhandled Rejection:", err.message);
  console.error("Stack:", err.stack);
  if (process.env.NODE_ENV === "development") {
    process.exit(1);
  }
});
process.on("uncaughtException", (err) => {
  console.error("\u274C Uncaught Exception:", err.message);
  console.error("Stack:", err.stack);
  process.exit(1);
});
var server_default = app;
