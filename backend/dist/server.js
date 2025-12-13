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
(0, import_database.default)();
const isDevelopment = process.env.NODE_ENV !== "production";
const corsOptions = {
  origin: (origin, callback) => {
    try {
      if (!origin) {
        return callback(null, true);
      }
      if (isDevelopment) {
        return callback(null, true);
      }
      const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, "");
      const allowedOrigins = [];
      if (process.env.CLIENT_URL) {
        const clientUrl = process.env.CLIENT_URL.trim();
        allowedOrigins.push(clientUrl);
        if (clientUrl.endsWith("/")) {
          allowedOrigins.push(clientUrl.slice(0, -1));
        } else {
          allowedOrigins.push(clientUrl + "/");
        }
      }
      if (origin.toLowerCase().includes(".vercel.app")) {
        console.log(`CORS: Allowing Vercel origin: ${origin}`);
        return callback(null, true);
      }
      if (normalizedOrigin === "https://pos-production.vercel.app") {
        console.log(`CORS: Allowing production origin: ${origin}`);
        return callback(null, true);
      }
      const normalizedAllowed = allowedOrigins.map((o) => o.trim().toLowerCase().replace(/\/$/, ""));
      if (normalizedAllowed.includes(normalizedOrigin) || allowedOrigins.some((o) => o.toLowerCase() === origin.toLowerCase())) {
        console.log(`CORS: Allowing configured origin: ${origin}`);
        return callback(null, true);
      }
      console.warn(`CORS: Origin not allowed: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    } catch (error) {
      console.error("CORS validation error:", error);
      callback(new Error("CORS validation failed"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Authorization"],
  optionsSuccessStatus: 204,
  preflightContinue: false
};
app.use((0, import_cors.default)(corsOptions));
app.use(import_express.default.json());
app.use(import_express.default.urlencoded({ extended: true }));
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "POS System API is running",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use("/api/auth", import_auth.default);
app.use("/api/users", import_users.default);
app.use("/api/categories", import_categories.default);
app.use("/api/brands", import_brands.default);
app.use("/api/units", import_units.default);
app.use("/api/warehouses", import_warehouses.default);
app.use("/api/products", import_products.default);
app.use("/api/admin", import_admin.default);
app.use("/api/payments", import_payments.default);
app.use("/api/merchants", import_merchants.default);
app.use("/api/settings", import_settings.default);
app.use("/api/customers", import_customers.default);
app.use("/api/sales", import_sales.default);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});
app.use(import_error.errorHandler);
app.listen(PORT, () => {
  console.log(`\u{1F680} Server running on http://localhost:${PORT}`);
  console.log(`\u{1F4DD} Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`\u{1F517} API Health: http://localhost:${PORT}/health`);
});
process.on("unhandledRejection", (err) => {
  console.error("\u274C Unhandled Rejection:", err.message);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("\u274C Uncaught Exception:", err.message);
  process.exit(1);
});
var server_default = app;
