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
var database_exports = {};
__export(database_exports, {
  default: () => database_default,
  ensureAdminDatabase: () => ensureAdminDatabase,
  sanitizeMongoUri: () => sanitizeMongoUri
});
module.exports = __toCommonJS(database_exports);
var import_mongoose = __toESM(require("mongoose"));
var import_logger = require("../utils/logger");
function sanitizeMongoUri(uri) {
  const queryIndex = uri.indexOf("?");
  if (queryIndex === -1) {
    return uri;
  }
  const uriWithoutQuery = uri.substring(0, queryIndex);
  const queryString = uri.substring(queryIndex + 1);
  const params = new URLSearchParams(queryString);
  const x509Params = [
    "authMechanism",
    "authSource",
    "tlsCertificateKeyFile",
    "tlsCAFile",
    "tlsCertificateKeyFilePassword",
    "tlsAllowInvalidCertificates",
    "tlsAllowInvalidHostnames"
  ];
  let removedParams = [];
  x509Params.forEach((param) => {
    if (params.has(param)) {
      removedParams.push(param);
      params.delete(param);
    }
  });
  if (removedParams.length > 0) {
    import_logger.log.warn(`Removed X.509 authentication parameters from MongoDB URI: ${removedParams.join(", ")}`);
    import_logger.log.warn("Using standard username/password authentication instead");
  }
  const cleanedQueryString = params.toString();
  return cleanedQueryString ? `${uriWithoutQuery}?${cleanedQueryString}` : uriWithoutQuery;
}
function ensureAdminDatabase(uri) {
  const sanitizedUri = sanitizeMongoUri(uri);
  const ADMIN_DB_NAME = "admin_db";
  const queryIndex = sanitizedUri.indexOf("?");
  const uriWithoutQuery = queryIndex > 0 ? sanitizedUri.substring(0, queryIndex) : sanitizedUri;
  const queryString = queryIndex > 0 ? sanitizedUri.substring(queryIndex) : "";
  const protocolIndex = uriWithoutQuery.indexOf("://");
  if (protocolIndex === -1) {
    throw new Error("Invalid MongoDB URI format: missing protocol");
  }
  const afterProtocol = uriWithoutQuery.substring(protocolIndex + 3);
  const hostEndIndex = afterProtocol.indexOf("/");
  if (hostEndIndex === -1) {
    return `${uriWithoutQuery}/${ADMIN_DB_NAME}${queryString}`;
  }
  const protocolAndHost = uriWithoutQuery.substring(0, protocolIndex + 3 + hostEndIndex);
  const cleanProtocolAndHost = protocolAndHost.replace(/\/+$/, "");
  return `${cleanProtocolAndHost}/${ADMIN_DB_NAME}${queryString}`;
}
const connectDB = async (retryCount = 0) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1e3;
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    const uriWithAdminDb = ensureAdminDatabase(mongoUri);
    if (retryCount === 0) {
      import_logger.log.info("Connecting to main MongoDB database...");
    } else {
      import_logger.log.info(`Retrying main MongoDB connection (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
    }
    const conn = await import_mongoose.default.connect(uriWithAdminDb, {
      autoCreate: true,
      // Allow auto-creation (models can override with autoCreate: false)
      autoIndex: true,
      // Create indexes automatically for better query performance
      serverSelectionTimeoutMS: 3e4,
      // Increased to 30 seconds
      socketTimeoutMS: 6e4,
      // Increased to 60 seconds
      connectTimeoutMS: 3e4,
      // Increased to 30 seconds
      retryWrites: true,
      w: "majority",
      family: 4
      // Force IPv4 to avoid IPv6 issues
    });
    import_logger.log.info(`Main MongoDB Connected: ${conn.connection.host}`);
    import_logger.log.info(`Database: ${conn.connection.name}`);
  } catch (error) {
    const errorMessage = error?.message || "Unknown error";
    const isNetworkError = errorMessage.includes("ETIMEOUT") || errorMessage.includes("ENOTFOUND") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ERR_INTERNET_DISCONNECTED") || errorMessage.includes("timeout") || errorMessage.includes("network") || errorMessage.includes("querySrv");
    if (isNetworkError && retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      import_logger.log.warn(`Network error connecting to main database: ${errorMessage}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDB(retryCount + 1);
    }
    import_logger.log.error("MongoDB connection error", error, { errorMessage });
    throw error;
  }
};
var database_default = connectDB;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ensureAdminDatabase,
  sanitizeMongoUri
});
